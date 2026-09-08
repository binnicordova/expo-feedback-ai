import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Identifies this app to the backend, on all three platforms.
 *
 * The order matters, and the first entry is the whole reason this function is not a
 * one-liner. `expo-application` reports the *running binary's* identifier, which
 * inside Expo Go is Expo Go itself (`host.exp.Exponent`) — so every app in
 * development would share one board and none would see its own. What the app declares
 * about itself is right in Expo Go and in a standalone build alike, so that comes
 * first and the binary is only a fallback for a bare app with no Expo config.
 *
 * The web has no bundle id, so the origin's hostname stands in. That makes a web
 * build's id environment-dependent ("localhost" in dev, your domain in production).
 */
export const resolveAppId = () => {
	if (Platform.OS === "web") {
		return globalThis.location?.hostname || "web";
	}

	const config = Constants.expoConfig as
		| {
				ios?: { bundleIdentifier?: string };
				android?: { package?: string };
				slug?: string;
				originalFullName?: string;
		  }
		| null
		| undefined;

	const declared =
		Platform.OS === "ios"
			? config?.ios?.bundleIdentifier
			: config?.android?.package;
	if (declared) return declared;

	// Declared nothing yet — early in a project, before the native ids are set.
	// `originalFullName` is `@owner/slug`, which is unique across accounts.
	if (config?.originalFullName) return config.originalFullName;
	if (config?.slug) return config.slug;

	try {
		// A require, not an import: an import would be hoisted and the module would
		// be resolved at bundle time, which is the cost this is here to avoid.
		const Application = require("expo-application") as {
			applicationId?: string | null;
		};
		if (Application.applicationId) return Application.applicationId;
	} catch {
		// Not installed: the fallback below is still better than throwing.
	}

	return `${Platform.OS}:unknown`;
};
