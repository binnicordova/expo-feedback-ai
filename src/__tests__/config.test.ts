import { applyConfig, reportError } from "../config";
import { resolveThemes } from "../constants/theme";
import { syncFeedbAI } from "../sync/sync";

jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("failures", () => {
	// A sync pass runs from a timer nobody awaits, so a rejection here would land in
	// the consumer's app as an unhandled promise the first time a user loses signal.
	it("never rejects, and reports the failure instead", async () => {
		const onError = jest.fn();
		const boom = new Error("offline");
		applyConfig({
			onError,
			api: {
				fetchFeed: async () => {
					throw boom;
				},
				pushVotes: async () => true,
				createFeedback: async () => true,
			},
		});

		await expect(syncFeedbAI(true)).resolves.toBeUndefined();
		expect(onError).toHaveBeenCalledWith(boom);
	});

	it("survives an onError that throws", () => {
		applyConfig({
			onError: () => {
				throw new Error("bad logger");
			},
		});
		expect(() => reportError(new Error("original"))).not.toThrow();
	});
});

describe("theme", () => {
	it("applies a shared override to both schemes", () => {
		const { light, dark } = resolveThemes({ primaryColor: "#ff0000" });
		expect(light.primaryColor).toBe("#ff0000");
		expect(dark.primaryColor).toBe("#ff0000");
		// Everything else keeps the palette built for that scheme.
		expect(light.backgroundColor).not.toBe(dark.backgroundColor);
	});

	it("lets dark tune what the shared override set", () => {
		const { light, dark } = resolveThemes({
			primaryColor: "#4f46e5",
			dark: { primaryColor: "#8b85f5" },
		});
		expect(light.primaryColor).toBe("#4f46e5");
		expect(dark.primaryColor).toBe("#8b85f5");
	});
});
