import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { FeedbackItem } from "../types/FeedbAI";

export type FeedbAIListProps = {
	/** Fires after the optimistic vote is applied. */
	onVote?: (item: FeedbackItem, liked: boolean) => void;
	onItemPress?: (item: FeedbackItem) => void;
	emptyLabel?: string;
	containerStyle?: StyleProp<ViewStyle>;
	/** Padding for the scrolled content — use it to clear a floating button. */
	contentStyle?: StyleProp<ViewStyle>;
	itemStyle?: StyleProp<ViewStyle>;
	ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
};

export type FeedbAIComposerProps = {
	onSubmit?: (feedback: { title: string; description: string }) => void;
	titlePlaceholder?: string;
	descriptionPlaceholder?: string;
	/** Accessibility label for the send button, which is icon-only. */
	submitLabel?: string;
	/** Focus the title on mount — the keyboard opens with the composer. */
	autoFocus?: boolean;
	style?: StyleProp<ViewStyle>;
	inputStyle?: StyleProp<TextStyle>;
};

export type FeedbAISheetProps = {
	visible: boolean;
	onClose: () => void;
	/** Board heading. */
	title?: string;
	/**
	 * The line under the heading. Defaults to naming your build cadence, taken from
	 * `rankCycleMs` — so what the board promises cannot drift from how it ranks.
	 */
	subtitle?: string;
	/** Dismiss control, top right. */
	closeLabel?: string;
	/** The floating button that opens the composer sheet. */
	composeLabel?: string;
	/** Share of the window height the sheet covers. Default 0.92. */
	heightRatio?: number;
	emptyLabel?: string;
	onVote?: FeedbAIListProps["onVote"];
	onItemPress?: FeedbAIListProps["onItemPress"];
	/** Fires after a feedback written in the stacked composer is queued. */
	onSubmit?: FeedbAIComposerProps["onSubmit"];
	/** Overrides for the composer sheet stacked on top of this one. */
	composerProps?: Omit<FeedbAIComposerSheetProps, "visible" | "onClose">;
	style?: StyleProp<ViewStyle>;
	itemStyle?: StyleProp<ViewStyle>;
};

export type FeedbAIComposerSheetProps = {
	visible: boolean;
	onClose: () => void;
	title?: string;
	subtitle?: string;
	/** Dismiss control, top right. */
	cancelLabel?: string;
	titlePlaceholder?: FeedbAIComposerProps["titlePlaceholder"];
	descriptionPlaceholder?: FeedbAIComposerProps["descriptionPlaceholder"];
	submitLabel?: FeedbAIComposerProps["submitLabel"];
	onSubmit?: FeedbAIComposerProps["onSubmit"];
	style?: StyleProp<ViewStyle>;
};
