import { getDefaultStore } from "jotai";
import {
	feedAtom,
	feedbacksAtom,
	orderAtom,
	resettleOrderAtom,
} from "../atoms/data";
import { draftsAtom, pendingVotesAtom, votesAtom } from "../atoms/user";
import { RANK_CYCLE_MS } from "../constants/env";
import type { Feedback } from "../types/FeedbAI";
import { newcomerBoost, scoreOf } from "../utils/rank";

jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const store = getDefaultStore();
const now = Date.now();
const cyclesAgo = (cycles: number) => now - cycles * RANK_CYCLE_MS;

const item = (uid: string, likes: number, createdAt?: number): Feedback => ({
	uid,
	title: uid,
	description: "d",
	likes,
	createdAt,
});

describe("newcomerBoost", () => {
	it("scales with the board it is on", () => {
		expect(newcomerBoost([0, 2, 3, 4, 6].map((n, i) => item(`a${i}`, n)))).toBe(
			4,
		);
		expect(
			newcomerBoost([0, 200, 300, 400, 600].map((n, i) => item(`a${i}`, n))),
		).toBe(400);
	});

	it("is never zero, so recency still orders an unvoted board", () => {
		expect(newcomerBoost([item("a", 0), item("b", 0)])).toBe(1);
	});

	it("is zero on an empty board", () => {
		expect(newcomerBoost([])).toBe(0);
	});
});

describe("scoreOf", () => {
	const score = (entry: Feedback) => scoreOf(entry, now, 4, RANK_CYCLE_MS);

	it("gives a brand new idea the full head start", () => {
		expect(score(item("new", 0, now))).toBeCloseTo(4);
	});

	it("halves the head start every cycle", () => {
		expect(score(item("a", 0, cyclesAgo(1)))).toBeCloseTo(2);
		expect(score(item("a", 0, cyclesAgo(2)))).toBeCloseTo(1);
	});

	it("leaves an established idea standing on its votes", () => {
		expect(score(item("old", 6, cyclesAgo(7)))).toBeCloseTo(6.03, 1);
	});

	it("ranks an undated item on votes alone rather than burying it", () => {
		expect(score(item("undated", 9))).toBe(9);
	});
});

describe("board order", () => {
	const uids = () => store.get(feedbacksAtom).map((entry) => entry.uid);

	beforeEach(() => {
		store.set(votesAtom, {});
		store.set(pendingVotesAtom, {});
		store.set(draftsAtom, []);
		store.set(orderAtom, []);
		store.set(feedAtom, {
			generatedAt: now,
			items: [
				item("wanted", 6, cyclesAgo(7)),
				item("liked", 4, cyclesAgo(3)),
				item("ignored", 0, cyclesAgo(5)),
				item("fresh", 0, now),
			],
		});
		store.set(resettleOrderAtom);
	});

	it("keeps the most wanted idea on top", () => {
		expect(uids()[0]).toBe("wanted");
	});

	it("lifts a brand new idea over the ones nobody voted for", () => {
		expect(uids().indexOf("fresh")).toBeLessThan(uids().indexOf("ignored"));
	});

	it("does not let a brand new idea outrank real support", () => {
		expect(uids().indexOf("wanted")).toBeLessThan(uids().indexOf("fresh"));
	});

	it("drops a newcomer back to its votes once its cycles are up", () => {
		store.set(feedAtom, (feed) => ({
			...feed,
			items: feed.items.map((entry) =>
				entry.uid === "fresh" ? { ...entry, createdAt: cyclesAgo(6) } : entry,
			),
		}));
		store.set(resettleOrderAtom);
		expect(uids()[uids().length - 1]).toBe("fresh");
	});

	it("shows your own unpublished draft above the whole board", () => {
		store.set(draftsAtom, [{ ...item("local_mine", 0, now), sent: false }]);
		store.set(resettleOrderAtom);
		expect(uids()[0]).toBe("local_mine");
	});
});
