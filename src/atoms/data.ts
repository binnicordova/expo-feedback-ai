import { atom } from "jotai";
import { RANK_CYCLE_MS } from "../constants/env";
import type { FeedbackFeed, FeedbackItem } from "../types/FeedbAI";
import { byScore, newcomerBoost, scoreOf } from "../utils/rank";
import { persistentAtom } from "./storage";
import { draftsAtom, pendingVotesAtom, votesAtom } from "./user";

/** Last downloaded feed. Cached so the list renders instantly and offline. */
export const feedAtom = persistentAtom<FeedbackFeed>("feed", {
	generatedAt: 0,
	items: [],
});

export const lastFlushAtom = persistentAtom("lastFlushAt", 0);

/** False until storage has been read, so the UI can tell "empty" from "not loaded". */
export const readyAtom = atom(false);

/**
 * Rows are rebuilt on every vote, which would give each one a new identity and
 * re-render the whole list. Handing back the previous object when nothing about a
 * row changed keeps `FeedbAIItem`'s memo effective.
 *
 * Pruned to the rows of the last rebuild (`forget`), so a long session that has seen
 * many published feeds does not hold every idea that ever passed through one.
 */
const identities = new Map<string, { signature: string; item: FeedbackItem }>();

const forgetExcept = (uids: Set<string>) => {
	for (const uid of identities.keys()) {
		if (!uids.has(uid)) identities.delete(uid);
	}
};

const stabilize = (item: FeedbackItem) => {
	const signature = [
		item.title,
		item.description,
		item.likes,
		item.liked,
		item.pending,
		item.comments,
		item.agentBuilding,
		item.author,
		item.createdAt,
	].join("\u0000");

	const known = identities.get(item.uid);
	if (known?.signature === signature) return known.item;

	identities.set(item.uid, { signature, item });
	return item;
};

/**
 * The list by rank: your own unpublished drafts first — nobody else can vote for
 * them yet, and you need to see that what you wrote is really there — then the
 * published board by score, which is votes plus a head start for ideas too new to
 * have earned any. See `utils/rank` for why votes alone are not enough here.
 */
const rankedAtom = atom<FeedbackItem[]>((get) => {
	const { items } = get(feedAtom);
	const votes = get(votesAtom);
	const pending = get(pendingVotesAtom);
	const publishedUids = new Set(items.map((item) => item.uid));

	const withLocalState = (item: FeedbackItem): FeedbackItem => {
		const vote = pending[item.uid];
		return {
			...item,
			likes: Math.max(0, item.likes + (vote ? (vote.liked ? 1 : -1) : 0)),
			liked: votes[item.uid] ?? false,
		};
	};

	const drafts = get(draftsAtom)
		.filter((draft) => !publishedUids.has(draft.uid))
		.map((draft) =>
			stabilize(withLocalState({ ...draft, liked: false, pending: true })),
		);

	const now = Date.now();
	const boost = newcomerBoost(items);

	const published = items.map((item) =>
		stabilize(withLocalState({ ...item, liked: false, pending: false })),
	);

	// Scored once per ranking rather than inside the comparator: the score of a row
	// must not move between two comparisons of the same sort.
	const scores = new Map(
		published.map((item) => [
			item.uid,
			scoreOf(item, now, boost, RANK_CYCLE_MS),
		]),
	);
	const ranked = published.sort(byScore(scores));
	const rows = [...drafts, ...ranked];

	forgetExcept(new Set(rows.map((row) => row.uid)));
	return rows;
});

/**
 * The order rows are currently drawn in. Held still while the list is on screen so
 * a vote never makes the row jump out from under the finger that cast it; it is
 * re-settled from the ranking when the list mounts and when a new feed lands.
 */
export const orderAtom = atom<string[]>([]);

/** Re-ranks the visible list. Owned by the module — see `feedbacksAtom`. */
export const resettleOrderAtom = atom(null, (get, set) => {
	set(
		orderAtom,
		get(rankedAtom).map((item) => item.uid),
	);
});

/** What the UI renders: ranked items, held in their settled positions. */
export const feedbacksAtom = atom<FeedbackItem[]>((get) => {
	const ranked = get(rankedAtom);
	const order = get(orderAtom);
	if (order.length === 0) return ranked;

	// Anything the settled order has not seen yet (a fresh draft) goes on top.
	const position = new Map(order.map((uid, index) => [uid, index]));
	return [...ranked].sort(
		(a, b) => (position.get(a.uid) ?? -1) - (position.get(b.uid) ?? -1),
	);
});
