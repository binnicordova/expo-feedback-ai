import type { Feedback } from "../types/FeedbAI";

/**
 * Ranking on raw votes alone has one failure mode, and this board hits it hard: a
 * new idea starts at zero, sorts below everything, is never read, and so never
 * earns the votes that would lift it. Meanwhile the top of the board is harvested
 * every cycle — the most-wanted ideas get built and leave the feed — so the only
 * thing that reliably changes is that the ideas nobody has seen sink further.
 *
 * So an idea enters with a head start worth as many votes as an already
 * well-supported one, and that head start halves every publish cycle. A newcomer
 * gets one cycle of real exposure; after two or three it stands on the votes it
 * actually earned. Votes remain the long-run signal — which matters, because the
 * build queue is picked from them.
 */

/**
 * The head start, in votes: the 75th percentile of what is on the board. Taking it
 * from the feed itself keeps the boost meaningful whether ideas here top out at 6
 * votes or 600 — a fixed number would be decisive on one board and noise on the other.
 */
export const newcomerBoost = (items: Feedback[]) => {
	if (!items.length) return 0;
	const likes = items
		.map((item) => Math.max(0, item.likes))
		.sort((a, b) => a - b);
	const p75 = likes[Math.ceil(likes.length * 0.75) - 1] ?? 0;
	// Never zero: on a board where nothing has been voted for yet, recency is the
	// only signal there is, and it should still order the list.
	return Math.max(1, p75);
};

export const scoreOf = (
	item: Feedback,
	now: number,
	boost: number,
	cycleMs: number,
) => {
	// An item the backend sent without a date cannot be aged, so it ranks on votes
	// alone rather than being treated as infinitely old and buried.
	if (!item.createdAt) return item.likes;
	const cycles = Math.max(0, now - item.createdAt) / cycleMs;
	return item.likes + boost * 2 ** -cycles;
};

/** Highest score first; between equal scores the newer idea goes on top. */
export const byScore =
	(scores: Map<string, number>) => (a: Feedback, b: Feedback) =>
		(scores.get(b.uid) ?? 0) - (scores.get(a.uid) ?? 0) ||
		(b.createdAt ?? 0) - (a.createdAt ?? 0);
