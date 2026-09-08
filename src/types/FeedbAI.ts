/** A single feedback entry as published in the public feed. */
export type Feedback = {
	uid: string;
	title: string;
	description: string;
	likes: number;
	/** Display name of whoever submitted it. The avatar initials come from this. */
	author?: string;
	/** Replies on the web dashboard — read-only here. */
	comments?: number;
	/**
	 * An AI agent has picked this up and is writing the code for it; it is meant to
	 * land in the app's next release. Drives the badge beside the counters.
	 */
	agentBuilding?: boolean;
	createdAt?: number;
};

/**
 * The whole feed, served as one static JSON file from a CDN.
 * `generatedAt` lets the client expire optimistic deltas the file already includes.
 */
export type FeedbackFeed = {
	generatedAt: number;
	items: Feedback[];
};

/** A vote made on this device that the downloaded feed does not reflect yet. */
export type PendingVote = {
	liked: boolean;
	at: number;
	/** Set once the vote reached the write endpoint; only then can it be pruned. */
	sent?: boolean;
};

/** A feedback created on this device, kept until the feed publishes it. */
export type DraftFeedback = Feedback & { sent: boolean };

/** What the UI renders: feed counts + this device's local state. */
export type FeedbackItem = Feedback & {
	liked: boolean;
	/** Created on this device and not published in the feed yet (in moderation). */
	pending: boolean;
};
