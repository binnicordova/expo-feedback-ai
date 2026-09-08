import { useColorScheme } from "react-native";
import { getConfig } from "../config";
import { type FeedbAIStyles, stylesFor } from "../constants/styles";
import { type FeedbAITheme, pickScheme } from "../constants/theme";

/**
 * The palette and the stylesheet built from it, for the scheme currently in force.
 *
 * Every view calls this instead of importing colours or a stylesheet directly, which
 * is what lets one `theme` in the config reach the whole board — and what makes the
 * board follow the device into dark mode without the consumer doing anything.
 */
export const useFeedbAITheme = (): {
	theme: FeedbAITheme;
	styles: FeedbAIStyles;
} => {
	const system = useColorScheme();
	const { themes, colorScheme } = getConfig();
	const theme = themes[pickScheme(colorScheme, system)];
	return { theme, styles: stylesFor(theme) };
};
