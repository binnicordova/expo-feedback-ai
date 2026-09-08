import type { ColorSchemeName } from "react-native";

/**
 * Every colour the board draws with. There is no colour anywhere else in the
 * module: a view asks `useFeedbAITheme()` for this object and for the stylesheet
 * built from it, so a consumer can restyle the whole board from one place.
 */
export type FeedbAITheme = {
	backgroundColor: string;
	surfaceColor: string;
	borderColor: string;
	/** Headings and primary text. */
	color: string;
	/** Body copy — one step down from `color`. */
	bodyColor: string;
	mutedColor: string;
	iconColor: string;
	/** Your brand colour: the heart when voted, the send button, the compose pill. */
	primaryColor: string;
	/** Dimmed app behind an open sheet. */
	scrimColor: string;
	grabberColor: string;
	/** Text and icons drawn on top of `primaryColor`. */
	onPrimaryColor: string;
};

/**
 * What `initializeFeedbAI({ theme })` accepts. Anything at the top level applies to
 * both colour schemes — passing `{ primaryColor }` alone is the common case — and
 * `dark` overrides just the dark one on top of that.
 */
export type FeedbAIThemeOverrides = Partial<FeedbAITheme> & {
	dark?: Partial<FeedbAITheme>;
};

export const lightTheme: FeedbAITheme = {
	backgroundColor: "#ffffff",
	surfaceColor: "#f2f2f5",
	borderColor: "#e5e5ea",
	color: "#12121a",
	bodyColor: "#3a3a42",
	mutedColor: "#8e8e97",
	iconColor: "#8e8e97",
	primaryColor: "#4f46e5",
	scrimColor: "rgba(0, 0, 0, 0.35)",
	grabberColor: "#d8d8dd",
	onPrimaryColor: "#ffffff",
};

/**
 * Not the light palette inverted: the indigo is lifted so it still reads as the
 * accent against a dark ground, and the scrim is deepened because the sheet behind
 * it no longer separates itself by brightness alone.
 */
export const darkTheme: FeedbAITheme = {
	backgroundColor: "#131316",
	surfaceColor: "#1f1f25",
	borderColor: "#2e2e36",
	color: "#f4f4f7",
	bodyColor: "#c4c4cd",
	mutedColor: "#8e8e97",
	iconColor: "#8e8e97",
	primaryColor: "#8b85f5",
	scrimColor: "rgba(0, 0, 0, 0.55)",
	grabberColor: "#3a3a44",
	onPrimaryColor: "#0d0d12",
};

export type FeedbAIThemes = { light: FeedbAITheme; dark: FeedbAITheme };

/**
 * Folds the consumer's overrides into both palettes, once per `applyConfig`. The two
 * objects it returns are then stable for the life of the config, which is what lets
 * `stylesFor` cache a compiled stylesheet against each of them.
 */
export const resolveThemes = (
	overrides: FeedbAIThemeOverrides = {},
): FeedbAIThemes => {
	const { dark, ...shared } = overrides;
	return {
		light: { ...lightTheme, ...shared },
		dark: { ...darkTheme, ...shared, ...dark },
	};
};

/** `"system"` follows the device; the other two pin the board regardless of it. */
export type FeedbAIColorScheme = "light" | "dark" | "system";

export const pickScheme = (
	preference: FeedbAIColorScheme,
	system: ColorSchemeName,
): "light" | "dark" =>
	preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
