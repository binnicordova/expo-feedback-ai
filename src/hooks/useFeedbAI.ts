import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { feedbacksAtom, readyAtom, resettleOrderAtom } from "../atoms/data";
import { feedbAIStore } from "../atoms/store";
import { createFeedbackAtom, toggleVoteAtom } from "../atoms/user";
import { ensureStarted } from "../initialize";
import { flushNow, syncFeedbAI } from "../sync/sync";

/**
 * Every hook reads the module's own store rather than whichever one React context
 * happens to provide — see `atoms/store`.
 */
const options = { store: feedbAIStore };

/**
 * The list to render: feed counts with this device's optimistic changes applied,
 * in the order the module currently holds — voting does not reshuffle it.
 *
 * Starts the sync loop on first mount if the app never called `initializeFeedbAI`,
 * and settles the ranking, so rendering your own list gets the same behaviour
 * `FeedbAIList` has without any setup.
 */
export const useFeedbacks = () => {
	const resettle = useSetAtom(resettleOrderAtom, options);

	// Rank once per mount, then hold that order so a vote never moves the row the
	// user is touching. The next mount (or feed refresh) settles the new order.
	useEffect(() => {
		ensureStarted();
		resettle();
	}, [resettle]);

	return useAtomValue(feedbacksAtom, options);
};

/** False until persisted state has been read. Distinguishes "empty" from "loading". */
export const useFeedbAIReady = () => useAtomValue(readyAtom, options);

/** `toggleVote(uid)` — instant locally, batched to the backend hourly. */
export const useToggleVote = () => useSetAtom(toggleVoteAtom, options);

/** `createFeedback({ title, description })` — appears at once, then flushes. */
export const useCreateFeedback = () => {
	const create = useSetAtom(createFeedbackAtom, options);
	return (input: { title: string; description: string }) => {
		const draft = create(input);
		void flushNow();
		return draft;
	};
};

/**
 * Pushes the queue and re-downloads the feed now, ignoring both timers. Resolves
 * when the pass is done and never rejects — wire it to a pull-to-refresh.
 */
export const refreshFeedbAI = () => syncFeedbAI(true);
