import { atom } from "jotai";
import type { DraftFeedback, PendingVote } from "../types/FeedbAI";
import { uuid } from "../utils/format";
import { persistentAtom } from "./storage";

/** Anonymous per-install id. Only ever sent as the author key of a vote. */
export const deviceIdAtom = persistentAtom("deviceId", "");

/** uid -> does this device like it. Source of truth for the filled heart. */
export const votesAtom = persistentAtom<Record<string, boolean>>("votes", {});

/** uid -> vote the downloaded feed does not include yet. Drives the optimistic count. */
export const pendingVotesAtom = persistentAtom<Record<string, PendingVote>>(
	"pendingVotes",
	{},
);

/** Feedbacks written here, shown as pending until the feed publishes them. */
export const draftsAtom = persistentAtom<DraftFeedback[]>("drafts", []);

/** Returns the device id, generating and persisting it on first use. */
export const deviceIdSetupAtom = atom(null, (get, set) => {
	const current = get(deviceIdAtom);
	if (current) return current;
	const next = uuid();
	set(deviceIdAtom, next);
	return next;
});

/** Flips the vote locally and queues it for the next hourly flush. */
export const toggleVoteAtom = atom(null, (get, set, uid: string) => {
	const liked = !get(votesAtom)[uid];
	set(votesAtom, { ...get(votesAtom), [uid]: liked });
	set(pendingVotesAtom, {
		...get(pendingVotesAtom),
		[uid]: { liked, at: Date.now() },
	});
});

/** Queues a new feedback; it shows up immediately as pending. */
export const createFeedbackAtom = atom(
	null,
	(get, set, input: { title: string; description: string }) => {
		const draft: DraftFeedback = {
			uid: `local_${uuid()}`,
			title: input.title.trim(),
			description: input.description.trim(),
			likes: 0,
			createdAt: Date.now(),
			sent: false,
		};
		set(draftsAtom, [draft, ...get(draftsAtom)]);
		return draft;
	},
);
