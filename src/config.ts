import { API_ORIGIN, FEED_ORIGIN } from "./constants/env";
import {
	type FeedbAIColorScheme,
	type FeedbAIThemeOverrides,
	type FeedbAIThemes,
	resolveThemes,
} from "./constants/theme";
import { createHttpApi } from "./services/api.http";
import type { FeedbAIApi } from "./services/api.types";
import { resolveAppId } from "./utils/appId";

/**
 * Everything this module lets you set — and nothing about *where* it talks or *how
 * often*.
 *
 * Those used to be options and are now resolved internally. The backend is fixed, the
 * app identifies itself by its own bundle id, and the sync cadence is a property of
 * the service rather than of the app embedding it. What is left here cannot be set
 * wrongly: it changes how the board looks and where its errors go.
 */
export type FeedbAIConfig = {
	/** Colours. `{ primaryColor }` alone is the usual case; `dark` tunes dark mode. */
	theme?: FeedbAIThemeOverrides;
	/** Follow the device by default; `"light"` or `"dark"` pins the board. */
	colorScheme?: FeedbAIColorScheme;
	/**
	 * Called when a sync pass fails — a dropped request, an unreachable endpoint.
	 * The module already swallows these (the board keeps working from its cache), so
	 * this is for your logging, not for recovery.
	 */
	onError?: (error: unknown) => void;
};

/** `api` is not public: it exists so the tests can run without a network. */
type InternalConfig = FeedbAIConfig & { api?: FeedbAIApi };

type ResolvedConfig = {
	themes: FeedbAIThemes;
	colorScheme: FeedbAIColorScheme;
	onError?: (error: unknown) => void;
};

let config: ResolvedConfig = {
	themes: resolveThemes(),
	colorScheme: "system",
};

/**
 * Resolved on first use and then cached, never at import: reading it can touch a
 * native module, and the module must be importable without paying for that.
 */
let appId: string | undefined;

export const getAppId = () => (appId ??= resolveAppId());

let api: FeedbAIApi | undefined;

/**
 * The transport, built once against the app's own id. The feed lives at a path named
 * for that id; the two writes are shared endpoints that carry it in the payload.
 */
export const getApi = () =>
	(api ??= createHttpApi(
		{
			feed: `${FEED_ORIGIN}/${encodeURIComponent(getAppId())}.json`,
			votes: `${API_ORIGIN}/votes`,
			feedbacks: `${API_ORIGIN}/feedbacks`,
		},
		getAppId,
	));

export const applyConfig = ({
	theme,
	api: override,
	...rest
}: InternalConfig) => {
	if (override) api = override;
	config = {
		...config,
		...rest,
		themes: theme ? resolveThemes(theme) : config.themes,
	};
};

export const getConfig = () => config;

/** Hands a failure to the consumer's `onError` without ever letting it throw back. */
export const reportError = (error: unknown) => {
	try {
		config.onError?.(error);
	} catch {
		// A logger that throws is not going to be fixed by throwing from the sync loop.
	}
};
