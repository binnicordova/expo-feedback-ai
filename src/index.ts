/**
 * Optional — the module starts itself the first time you render any of it. Call this
 * to point the board at your backend, or to restyle it.
 */

export type { FeedbAIConfig } from "./config";
export type {
	FeedbAIColorScheme,
	FeedbAITheme,
	FeedbAIThemeOverrides,
} from "./constants/theme";
/** Build the board yourself. `useFeedbacks` starts the module and settles the order. */
export {
	refreshFeedbAI,
	useCreateFeedback,
	useFeedbAIReady,
	useFeedbacks,
	useToggleVote,
} from "./hooks/useFeedbAI";
export { initializeFeedbAI } from "./initialize";
export type { FeedbAIApi } from "./services/api.types";
export type {
	DraftFeedback,
	Feedback,
	FeedbackFeed,
	FeedbackItem,
} from "./types/FeedbAI";
export type {
	FeedbAIComposerProps,
	FeedbAIComposerSheetProps,
	FeedbAIListProps,
	FeedbAISheetProps,
} from "./views/FeedbAI.types";
export { default as FeedbAIComposer } from "./views/FeedbAIComposer";
export { default as FeedbAIComposerSheet } from "./views/FeedbAIComposerSheet";
/** The pieces, for your own presentation. */
export { default as FeedbAIList } from "./views/FeedbAIList";
/** The drop-in: the whole board as a bottom sheet. */
export { default as FeedbAISheet } from "./views/FeedbAISheet";
