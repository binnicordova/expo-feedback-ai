import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WritableAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { STORAGE_PREFIX } from "../constants/env";
import { feedbAIStore } from "./store";

/**
 * AsyncStorage is async, which would make every atom resolve to a promise and
 * suspend the list. So atoms read from an in-memory mirror instead, and writes
 * are persisted in the background. `hydrateStorage` fills the mirror on startup.
 */
const mirror = new Map<string, string>();
/** Keys already written in this session; hydration must not clobber them. */
const dirty = new Set<string>();

const syncStorage = {
	getItem: (key: string) => mirror.get(key) ?? null,
	setItem: (key: string, value: string) => {
		mirror.set(key, value);
		dirty.add(key);
		void AsyncStorage.setItem(key, value);
	},
	removeItem: (key: string) => {
		mirror.delete(key);
		dirty.add(key);
		void AsyncStorage.removeItem(key);
	},
};

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous atom registry
const registry = new Map<string, WritableAtom<any, [any], void>>();

/** Namespaced atom persisted to AsyncStorage, readable synchronously. */
export const persistentAtom = <T>(key: string, initial: T) => {
	const namespaced = `${STORAGE_PREFIX}${key}`;
	const persisted = atomWithStorage<T>(
		namespaced,
		initial,
		createJSONStorage<T>(() => syncStorage),
	);
	registry.set(namespaced, persisted);
	return persisted;
};

let hydration: Promise<void> | undefined;

/**
 * Loads every persisted key into the mirror, once per process.
 *
 * Keys are found by prefix rather than from `registry`: bundlers that inline
 * requires (Metro's `inlineRequires`) defer the atom modules until first use, so
 * the registry can still be empty here. Atoms created afterwards read the filled
 * mirror at init; atoms created before are corrected from the registry below.
 */
export const hydrateStorage = () => {
	hydration ??= (async () => {
		const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
			key.startsWith(STORAGE_PREFIX),
		);
		for (const [key, value] of await AsyncStorage.multiGet(keys)) {
			if (value !== null && !dirty.has(key)) mirror.set(key, value);
		}

		for (const [key, persisted] of registry) {
			const raw = mirror.get(key);
			if (raw !== undefined && !dirty.has(key)) {
				feedbAIStore.set(persisted, JSON.parse(raw));
			}
		}
	})();
	return hydration;
};
