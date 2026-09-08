import type { FeedbackFeed } from "../types/FeedbAI";

export type VotePayload = { uid: string; liked: boolean; at: number }[];

export type NewFeedbackPayload = {
	uid: string;
	title: string;
	description: string;
	createdAt: number;
};

/**
 * Three independent endpoints, one job each — see example/functions/index.js.
 * Reads never touch a server: `fetchFeed` hits a static file on a CDN.
 */
export type FeedbAIApi = {
	/** Returns the feed, or `null` when the cached `generatedAt` is still current. */
	fetchFeed: (generatedAt: number) => Promise<FeedbackFeed | null>;
	/** Hourly batch of votes for one device. Idempotent per (deviceId, uid). */
	pushVotes: (deviceId: string, votes: VotePayload) => Promise<boolean>;
	/** Queues a new feedback for moderation. */
	createFeedback: (
		deviceId: string,
		feedback: NewFeedbackPayload,
	) => Promise<boolean>;
};
