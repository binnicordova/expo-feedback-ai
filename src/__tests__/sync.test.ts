import {
	feedAtom,
	feedbacksAtom,
	lastFlushAtom,
	orderAtom,
	resettleOrderAtom,
} from "../atoms/data";
import { feedbAIStore } from "../atoms/store";
import {
	createFeedbackAtom,
	deviceIdAtom,
	draftsAtom,
	pendingVotesAtom,
	toggleVoteAtom,
	votesAtom,
} from "../atoms/user";
import { applyConfig } from "../config";
import type { FeedbAIApi } from "../services/api.types";
import { refreshFeed, syncFeedbAI } from "../sync/sync";

jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The module owns its store rather than jotai's default one, so that an app with
// its own `<Provider>` cannot end up reading a different one than sync writes to.
const store = feedbAIStore;

/** Feed timestamps are real epoch ms, offset from now. */
const base = Date.now();

const item = (uid: string, likes: number) => ({
	uid,
	title: uid.toUpperCase(),
	description: "d",
	likes,
});

const feedAt = (offset: number, likes: number) => ({
	generatedAt: base + offset,
	items: [{ uid: "a", title: "A", description: "d", likes }],
});

const api = (overrides: Partial<FeedbAIApi> = {}): FeedbAIApi => ({
	fetchFeed: async () => null,
	pushVotes: async () => true,
	createFeedback: async () => true,
	...overrides,
});

beforeEach(() => {
	store.set(feedAtom, feedAt(-10_000, 10));
	store.set(votesAtom, {});
	store.set(pendingVotesAtom, {});
	store.set(lastFlushAtom, 0);
	store.set(deviceIdAtom, "test-device");
	store.set(orderAtom, []);
	applyConfig({ api: api() });
});

it("applies a vote optimistically", () => {
	store.set(toggleVoteAtom, "a");
	expect(store.get(feedbacksAtom)[0]).toMatchObject({ likes: 11, liked: true });
});

it("keeps the delta until a newer feed accounts for it", async () => {
	store.set(toggleVoteAtom, "a");
	applyConfig({
		api: api({ fetchFeed: async () => feedAt(10_000, 11) }),
	});

	await syncFeedbAI(true); // pushes the vote, then the feed catches up
	expect(store.get(feedbacksAtom)[0]).toMatchObject({ likes: 11, liked: true });
	expect(store.get(pendingVotesAtom)).toEqual({});
});

it("does not drop a vote the feed predates", async () => {
	store.set(toggleVoteAtom, "a");
	applyConfig({
		api: api({ fetchFeed: async () => feedAt(-5_000, 10) }),
	});

	await refreshFeed(true); // feed is newer than the cache but older than the vote
	expect(store.get(pendingVotesAtom).a).toBeDefined();
	expect(store.get(feedbacksAtom)[0]).toMatchObject({ likes: 11 });
});

it("sends only unsent votes and marks them", async () => {
	const pushVotes = jest.fn().mockResolvedValue(true);
	applyConfig({ api: api({ pushVotes }) });
	store.set(toggleVoteAtom, "a");

	await syncFeedbAI(true);
	await syncFeedbAI(true);

	expect(pushVotes).toHaveBeenCalledTimes(1);
	expect(pushVotes).toHaveBeenCalledWith("test-device", [
		{ uid: "a", liked: true, at: expect.any(Number) },
	]);
});

describe("list order", () => {
	const twoItems = {
		generatedAt: base - 10_000,
		items: [item("a", 10), item("b", 11)],
	};
	const uids = () => store.get(feedbacksAtom).map((entry) => entry.uid);

	beforeEach(() => {
		store.set(feedAtom, twoItems);
		store.set(resettleOrderAtom);
	});

	it("ranks by likes when it settles", () => {
		expect(uids()).toEqual(["b", "a"]);
	});

	it("holds the order while the user votes", () => {
		store.set(toggleVoteAtom, "a"); // a is now tied at 11 and would outrank b
		expect(uids()).toEqual(["b", "a"]);
		expect(store.get(feedbacksAtom)[1]).toMatchObject({ uid: "a", likes: 11 });
	});

	it("reuses the object of a row that did not change", () => {
		const before = store.get(feedbacksAtom);
		store.set(toggleVoteAtom, "a");
		const after = store.get(feedbacksAtom);

		const find = (list: typeof before, uid: string) =>
			list.find((entry) => entry.uid === uid);

		// Only the voted row gets a new identity, so memoised rows stay put.
		expect(find(after, "b")).toBe(find(before, "b"));
		expect(find(after, "a")).not.toBe(find(before, "a"));
	});

	it("re-ranks when asked, and when a new feed lands", async () => {
		store.set(toggleVoteAtom, "a");
		store.set(resettleOrderAtom);
		expect(uids()).toEqual(["a", "b"]);

		applyConfig({
			api: api({
				fetchFeed: async () => ({
					generatedAt: base + 10_000,
					items: [item("a", 11), item("b", 20)],
				}),
			}),
		});
		await syncFeedbAI(true);
		expect(uids()).toEqual(["b", "a"]);
	});
});

describe("client-generated ids", () => {
	const UUID =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

	beforeEach(() => {
		store.set(deviceIdAtom, "");
		store.set(draftsAtom, []);
	});

	it("posts the uid it minted, so a publish and a retry both match the draft", async () => {
		const createFeedback = jest.fn().mockResolvedValue(true);
		applyConfig({ api: api({ createFeedback }) });

		const draft = store.set(createFeedbackAtom, {
			title: "Dark mode",
			description: "at night",
		});
		expect(draft.uid).toMatch(/^local_/);
		expect(draft.uid.slice(6)).toMatch(UUID);

		await syncFeedbAI(true);
		expect(createFeedback.mock.calls[0][1]).toMatchObject({ uid: draft.uid });
	});

	it("mints one device id and keeps it across flushes", async () => {
		const pushVotes = jest.fn().mockResolvedValue(true);
		applyConfig({ api: api({ pushVotes }) });

		store.set(toggleVoteAtom, "a");
		await syncFeedbAI(true);
		const deviceId = pushVotes.mock.calls[0][0];
		expect(deviceId).toMatch(UUID);
		expect(store.get(deviceIdAtom)).toBe(deviceId);

		store.set(toggleVoteAtom, "b");
		await syncFeedbAI(true);
		expect(pushVotes.mock.calls[1][0]).toBe(deviceId);
	});
});
