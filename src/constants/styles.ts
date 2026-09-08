import { StyleSheet } from "react-native";
import type { FeedbAITheme } from "./theme";

/**
 * The whole stylesheet, as a function of the palette. Views never call
 * `StyleSheet.create` themselves — they take these from `useFeedbAITheme()`, which is
 * what makes one `theme` in the config reach every surface, dark mode included.
 */
const create = (theme: FeedbAITheme) =>
	StyleSheet.create({
		list: {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		},
		listContent: {
			paddingHorizontal: 13,
			paddingVertical: 8,
			gap: 21,
		},

		// One feedback: title, body, then a footer of author + counters.
		item: {
			gap: 5,
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			letterSpacing: -0.2,
			color: theme.color,
		},
		description: {
			fontSize: 16,
			lineHeight: 23,
			color: theme.bodyColor,
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
		},
		avatar: {
			width: 38,
			height: 38,
			borderRadius: 19,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.surfaceColor,
		},
		avatarLabel: {
			fontSize: 13,
			fontWeight: "700",
			color: theme.mutedColor,
		},
		author: {
			flex: 1,
		},
		authorName: {
			fontSize: 15,
			fontWeight: "600",
			color: theme.color,
		},
		authorMeta: {
			fontSize: 13,
			marginTop: 1,
			color: theme.mutedColor,
		},
		counters: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		counter: {
			flexDirection: "row",
			alignItems: "center",
			gap: 2,
		},
		counterValue: {
			fontSize: 14,
			color: theme.mutedColor,
		},
		pressed: {
			opacity: 0.5,
		},
		counterValueActive: {
			color: theme.primaryColor,
			fontWeight: "600",
		},
		empty: {
			padding: 13,
			textAlign: "center",
			color: theme.mutedColor,
		},

		// Composer
		composer: {
			gap: 5,
		},
		input: {
			paddingHorizontal: 8,
			paddingVertical: 5,
			fontSize: 15,
			borderWidth: 1,
			borderColor: theme.borderColor,
			borderRadius: 13,
			backgroundColor: theme.backgroundColor,
			color: theme.color,
		},
		inputMultiline: {
			minHeight: 92,
			textAlignVertical: "top",
		},
		// The send button sits on its own row, right-aligned, so it stays put as the
		// description grows and is always the last thing under the thumb.
		composerActions: {
			flexDirection: "row",
			justifyContent: "flex-end",
		},
		send: {
			width: 46,
			height: 46,
			borderRadius: 23,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.primaryColor,
		},
		sendDisabled: {
			backgroundColor: theme.borderColor,
		},

		// Sheets. Both sheets share this vocabulary so the stacked composer reads as the
		// same surface as the board it covers.
		sheetRoot: {
			flex: 1,
			justifyContent: "flex-end",
		},
		// Spelled out rather than spread from `StyleSheet.absoluteFillObject`: React
		// Native 0.82 dropped that export, and spreading the resulting `undefined` fails
		// silently — an unpositioned, zero-height view that types still accept.
		scrim: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: theme.scrimColor,
		},
		sheet: {
			backgroundColor: theme.backgroundColor,
			borderTopLeftRadius: 28,
			borderTopRightRadius: 28,
			overflow: "hidden",
		},
		sheetHeader: {
			height: 44,
			justifyContent: "center",
		},
		grabber: {
			alignSelf: "center",
			width: 40,
			height: 5,
			borderRadius: 3,
			backgroundColor: theme.grabberColor,
		},
		sheetDismiss: {
			position: "absolute",
			right: 13,
			paddingVertical: 4,
		},
		sheetDismissLabel: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.primaryColor,
		},
		// Aligned to the list gutter so the heading sits on the same left edge as the
		// title of every idea under it.
		sheetTitleBlock: {
			paddingHorizontal: 13,
			paddingTop: 4,
			paddingBottom: 12,
			gap: 3,
		},
		sheetTitle: {
			fontSize: 24,
			fontWeight: "700",
			letterSpacing: -0.3,
			color: theme.color,
		},
		sheetSubtitle: {
			fontSize: 15,
			lineHeight: 21,
			color: theme.mutedColor,
		},
		// The composer sheet has no list to scroll, so it sizes to its content and pads
		// its own sides instead.
		composerSheet: {
			paddingHorizontal: 20,
		},
		composerSheetTitleBlock: {
			paddingBottom: 12,
			gap: 3,
		},
		dock: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: 0,
			alignItems: "center",
			paddingHorizontal: 16,
		},
		pill: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingVertical: 15,
			paddingHorizontal: 26,
			borderRadius: 999,
			backgroundColor: theme.primaryColor,
			shadowColor: "#000000",
			shadowOpacity: 0.22,
			shadowRadius: 14,
			shadowOffset: { width: 0, height: 6 },
			elevation: 6,
		},
		pillLabel: {
			fontSize: 17,
			fontWeight: "600",
			color: theme.onPrimaryColor,
		},
	});

export type FeedbAIStyles = ReturnType<typeof create>;

/**
 * One compiled stylesheet per palette. `resolveThemes` builds each theme object once
 * per config, so this keys off identity and a re-render never recompiles.
 */
const compiled = new WeakMap<FeedbAITheme, FeedbAIStyles>();

export const stylesFor = (theme: FeedbAITheme): FeedbAIStyles => {
	const known = compiled.get(theme);
	if (known) return known;

	const styles = create(theme);
	compiled.set(theme, styles);
	return styles;
};
