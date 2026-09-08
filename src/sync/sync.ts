import {
	feedAtom,
	lastFlushAtom,
	readyAtom,
	resettleOrderAtom,
} from "../atoms/data";
import { hydrateStorage } from "../atoms/storage";
import { feedbAIStore as store } from "../atoms/store";
import { deviceIdSetupAtom, draftsAtom, pendingVotesAtom } from "../atoms/user";
import { getApi, reportError } from "../config";
import { DRAFT_TTL_MS, FEED_TTL_MS, FLUSH_INTERVAL_MS } from "../constants/env";
import type { VotePayload } from "../services/api.types";

/** Drops local state the published feed already accounts for. */
const prune = (generatedAt: number, publishedUids: Set<string>) => {
	const pending = store.get(pendingVotesAtom);
	const kept = Object.entries(pending).filter(
		([, vote]) => !(vote.sent && vote.at <= generatedAt),
	);
	if (kept.length !== Object.keys(pending).length) {
		store.set(pendingVotesAtom, Object.fromEntries(kept));
	}

	// A draft disappears once it is published, or once moderation has clearly dropped it.
	const staleBefore = Date.now() - DRAFT_TTL_MS;
	const drafts = store.get(draftsAtom);
	const keptDrafts = drafts.filter(
		(draft) =>
			!publishedUids.has(draft.uid) && (draft.createdAt ?? 0) > staleBefore,
	);
	if (keptDrafts.length !== drafts.length) store.set(draftsAtom, keptDrafts);
};

/** Downloads the public feed when the cached copy is past its TTL. */
export const refreshFeed = async (force = false) => {
	const feed = store.get(feedAtom);
	if (!force && Date.now() - feed.generatedAt < FEED_TTL_MS) return;

	const next = await getApi().fetchFeed(feed.generatedAt);
	if (!next) return;

	store.set(feedAtom, next);
	prune(
		next.generatedAt,
		new Set(next.items.map((item: { uid: string }) => item.uid)),
	);
	store.set(resettleOrderAtom);
};

/** Pushes every queued vote and unsent feedback in one batch, at most once an hour. */
export const flushQueue = async (force = false) => {
	if (!force && Date.now() - store.get(lastFlushAtom) < FLUSH_INTERVAL_MS)
		return;

	const api = getApi();

	const deviceId = store.set(deviceIdSetupAtom);
	const pending = store.get(pendingVotesAtom);
	const votes: VotePayload = Object.entries(pending)
		.filter(([, vote]) => !vote.sent)
		.map(([uid, vote]) => ({ uid, liked: vote.liked, at: vote.at }));

	const drafts = store.get(draftsAtom).filter((draft) => !draft.sent);
	if (!votes.length && !drafts.length) return;

	if (votes.length && (await api.pushVotes(deviceId, votes))) {
		// Identity check: a vote cast while the request was in flight is not ours to mark.
		store.set(pendingVotesAtom, (current) =>
			Object.fromEntries(
				Object.entries(current).map(([uid, vote]) => [
					uid,
					pending[uid] === vote ? { ...vote, sent: true } : vote,
				]),
			),
		);
	}

	for (const { uid, title, description, createdAt = Date.now() } of drafts) {
		const sent = await api.createFeedback(deviceId, {
			uid,
			title,
			description,
			createdAt,
		});
		if (!sent) continue;
		store.set(draftsAtom, (current) =>
			current.map((item) =>
				item.uid === uid ? { ...item, sent: true } : item,
			),
		);
	}

	store.set(lastFlushAtom, Date.now());
};

/**
 * One pass: flush the queue if due, then refresh the feed if stale. Safe to call
 * often. The order matters — flushing first marks votes as sent, so the refresh
 * that follows can prune the ones the new feed already counts.
 *
 * It never rejects. A sync pass runs unattended — from a timer, from a foreground
 * event — so a rejection here would surface in the consumer's app as an unhandled
 * promise from a library they only render, which is exactly what going through a
 * tunnel used to do. Failures go to `onError` and the cached board carries on.
 */
export const syncFeedbAI = async (force = false) => {
	try {
		await hydrateStorage();
		store.set(readyAtom, true);
		await flushQueue(force);
		await refreshFeed(force);
	} catch (error) {
		reportError(error);
	}
};

/** Sends the queue right away — use after a user action you don't want to lose. */
export const flushNow = async () => {
	try {
		await hydrateStorage();
		await flushQueue(true);
	} catch (error) {
		reportError(error);
	}
};
