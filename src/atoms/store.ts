import { createStore } from "jotai";

/**
 * The module's own jotai store.
 *
 * Not `getDefaultStore()`: `useAtomValue` resolves its store from React context, so
 * in an app that mounts its own jotai `<Provider>` the board would read one store
 * while the sync loop wrote to another — an empty list, votes that never flush, and
 * no error anywhere. Owning a store means the module's state is unaffected by what
 * the host app does with jotai, including having a second copy of it installed.
 */
export const feedbAIStore = createStore();
