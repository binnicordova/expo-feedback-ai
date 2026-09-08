import type { FeedbackFeed } from "../types/FeedbAI";
import type { FeedbAIApi } from "./api.types";

/**
 * Every call resolves rather than rejects. A feedback board is the least important
 * thing in the app it lives in: losing a sync pass means the cached board renders as
 * it did before, and the queue is pushed again on the next pass. `sync` reports the
 * failure to the consumer's `onError`; nothing here escapes into their app.
 */
const post = async (url: string, body: unknown) => {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		return response.ok;
	} catch {
		return false;
	}
};

/**
 * Real transport: one call per microservice. Reads are a plain CDN GET, writes
 * are batched so a device only talks to a server when it has something to say.
 *
 * `appId` arrives as a getter because resolving it can touch a native module, and
 * building the transport must stay free of that — see `getAppId`.
 */
export const createHttpApi = (
	endpoints: { feed: string; votes: string; feedbacks: string },
	appId: () => string,
): FeedbAIApi => ({
	fetchFeed: async (generatedAt) => {
		try {
			const response = await fetch(endpoints.feed);
			if (!response.ok) return null;
			const feed = (await response.json()) as FeedbackFeed;
			return feed.generatedAt > generatedAt ? feed : null;
		} catch {
			return null;
		}
	},
	pushVotes: (deviceId, votes) =>
		post(endpoints.votes, { appId: appId(), deviceId, votes }),
	createFeedback: (deviceId, feedback) =>
		post(endpoints.feedbacks, { appId: appId(), deviceId, ...feedback }),
});
