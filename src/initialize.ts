import { AppState } from "react-native";
import { applyConfig, type FeedbAIConfig } from "./config";
import { FLUSH_INTERVAL_MS } from "./constants/env";
import { syncFeedbAI } from "./sync/sync";

let teardown: (() => void) | undefined;

/**
 * Defers work until the app is idle, capped so it still runs on a busy startup.
 * `InteractionManager` is deprecated as of React Native 0.81; `requestIdleCallback`
 * is its replacement, with a timeout fallback for runtimes that lack it.
 */
const runWhenIdle = (task: () => void) => {
	if (typeof globalThis.requestIdleCallback === "function") {
		const handle = globalThis.requestIdleCallback(task, { timeout: 2_000 });
		return () => globalThis.cancelIdleCallback?.(handle);
	}
	const timeout = setTimeout(task, 0);
	return () => clearTimeout(timeout);
};

/**
 * Configures the module and starts its sync loop.
 *
 * Optional. The loop starts on its own the first time anything from this module is
 * rendered, so a board with no backend yet needs no setup at all — call this only to
 * say where your feed lives, or to change a default:
 *
 * ```ts
 * initializeFeedbAI({ projectId: 'com.acme.app' });
 * ```
 *
 * Call it from your app entry file, before the first render. Calling it again
 * replaces the previous loop, so config can be swapped at runtime.
 *
 * The loop is deliberately quiet: the first pass waits until the app is idle, and
 * the timer only runs while the app is in the foreground, so a feedback board never
 * competes with what the user actually opened the app for.
 *
 * @returns a teardown function; you rarely need it outside tests.
 */
export const initializeFeedbAI = (config: FeedbAIConfig = {}) => {
	applyConfig(config);
	teardown?.();

	let timer: ReturnType<typeof setInterval> | undefined;

	const startTimer = () => {
		timer ??= setInterval(() => void syncFeedbAI(), FLUSH_INTERVAL_MS);
	};

	const stopTimer = () => {
		if (timer !== undefined) clearInterval(timer);
		timer = undefined;
	};

	const subscription = AppState.addEventListener("change", (state) => {
		if (state !== "active") return stopTimer();
		void syncFeedbAI();
		startTimer();
	});

	const cancelFirstPass = runWhenIdle(() => {
		void syncFeedbAI();
		startTimer();
	});

	teardown = () => {
		cancelFirstPass();
		subscription.remove();
		stopTimer();
		teardown = undefined;
	};
	return teardown;
};

export const isInitialized = () => teardown !== undefined;

/**
 * Starts the loop if the app never called `initializeFeedbAI` itself.
 *
 * This is what makes `<FeedbAISheet />` work on its own. Forgetting an init call used
 * to leave a board that was permanently empty and reported nothing; there is now
 * nothing to forget. Idempotent, and an explicit `initializeFeedbAI` — before or
 * after — still wins, because it replaces whatever loop is running.
 *
 * Called from an effect rather than during render: it configures module-level state
 * and kicks off a pass that writes atoms.
 */
export const ensureStarted = () => {
	if (!isInitialized()) initializeFeedbAI();
};
