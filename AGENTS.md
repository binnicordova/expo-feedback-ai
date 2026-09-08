# expo-feedback-ai — working notes

An Expo module: an in-app feedback board whose most-voted ideas are built by an AI
agent on a fixed cadence. This file is what a previous session wished it had known.

## Layout

```
src/
  atoms/       jotai state — data.ts (feed + ranking), user.ts (votes, drafts),
               storage.ts, store.ts (the module's own store — see invariants)
  views/       every UI component, all prefixed FeedbAI*, plus the lowercase
               internals useSheetAnimation.ts and useTheme.ts
  hooks/       the public hooks (useFeedbacks, useToggleVote, …)
  services/    api.http.ts (real), api.mock.ts (demo feed), api.types.ts
  sync/        the foreground loop: flush queue, refresh feed
  utils/       rank.ts (scoring), format.ts (timeAgo, cadenceLabel, uuid), appId.ts
  constants/   env.ts (timings + default hosts), theme.ts (the palettes),
               styles.ts (the whole stylesheet, as a function of a palette)
  config.ts    resolves projectId/baseUrl/endpoints, theme, onError
  initialize.ts  initializeFeedbAI + ensureStarted (the auto-start)
  __tests__/   jest, run against the atoms and config directly — no renderer
example/       a two-file Expo app that consumes the module through metro, plus
               functions/ (the Firebase backend) and .github/ (the autopilot; every
               workflows carry their own constants; what you set is in .github/feedbai.env.example)
docs/media/    README images: 01-06 are simulator captures, hero/loop are generated
```

This is a **JS-only** module: no `ios/`, no `android/`, no `expo-module.config.json`.
Nothing here needs a prebuild, and adding native code would cost the module its
"works in Expo Go, no dev build" install story.

**Naming.** Every exported component is `FeedbAI<Thing>` in `src/views/`, one per file,
default-exported, with its props type in `src/views/FeedbAI.types.ts` and its styles in
`src/constants/styles.ts` (never a local `StyleSheet.create` in a view). Internal view
helpers are lowercase (`useSheetAnimation.ts`, `useTheme.ts`) and are not exported from
`src/index.ts`.

**Colour.** No view, and no icon, holds a colour of its own. A view calls
`useFeedbAITheme()` for `{ theme, styles }`; icons take their colours as required
props. That is the whole reason one `theme` in the config can restyle the board and
why dark mode needed no per-view work — keep it that way.

## Commands

```bash
npx tsc --noEmit          # module
cd example && npx tsc --noEmit
npx jest                  # 30 tests, ~1s
npx biome check src       # format + lint — clean; keep it that way
npm pack --dry-run        # builds, then shows exactly what would publish
```

**Known gap.** The module typechecks against the React Native in its own
devDependencies (0.82.1, paired with `jest-expo` ~55) while `example/` runs 0.86.3.
Bumping the module's copy would mean moving `expo`, `jest-expo` and `babel-preset-expo`
in step, so it was left alone for 0.1.0 — but it does mean a type-level removal in
0.83–0.86 would show up in the example before `tsc` here catches it. Run the example
after touching a view.

## Running it on the simulator

The example runs in **Expo Go** (no dev build, no `ios/` directory). Metro usually
already runs on 8081; starting a second one silently skips.

```bash
cd example && bunx expo start          # only if 8081 is free
xcrun simctl openurl <UDID> "exp://127.0.0.1:8081"
xcrun simctl io <UDID> screenshot docs/media/shot.png
```

- **Force a reload** with `xcrun simctl terminate <UDID> host.exp.Exponent` then
  `openurl` again. Fast Refresh is not reliable when you are driving the app from
  outside it.
- **Typing.** `simctl`/MCP text injection outruns RN's `TextInput` and drops
  characters — the demo data full of `wdts` and `olnmod` came from exactly that. Put
  the text on the simulator clipboard (`printf '…' | xcrun simctl pbcopy <UDID>`),
  long-press the field, tap **Paste**.
- **Reset demo state** (drafts and votes persist): delete `manifest.json` under
  `~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Containers/Data/Application/
  <expo-go>/Documents/ExponentExperienceData/@anonymous/expo-feedback-ai-example-*/RCTAsyncLocalStorage/`.
  That directory is scoped to this experience, so it touches nothing else.

## The backend, and why nothing about it is configurable

`example/index.ts` configures nothing at all. `FeedbAIConfig` is down to `theme`,
`colorScheme` and `onError` — endpoints, `appId` and every timer are resolved inside
the module (`constants/env.ts`, `config.ts`). The reasoning, so nobody re-adds them:

- **An endpoint you can set is an endpoint you can typo**, and a typo here is a board
  that silently stays empty — a failure the module gets blamed for. The feed path is
  named after the app's own bundle id (`utils/appId.ts`), so apps cannot collide and
  none has to be told what it is called.
- **Never resolve the app's identity from `expo-application`.** Its `applicationId` is
  the *running binary*, which inside Expo Go is Expo Go itself
  (`host.exp.Exponent`) — so every app in development would share one board and none
  would see its own. `utils/appId.ts` reads what the app declares about itself via
  `expo-constants` (`expoConfig.ios.bundleIdentifier` / `.android.package`), which is
  right in Expo Go and standalone alike; `expo-application` is only the fallback for a
  bare app with no Expo config. This shipped wrong once and was invisible, because the
  board kept rendering a *cached* feed while the live fetch 404'd against the wrong
  filename. When verifying the feed path, wipe AsyncStorage first (see below) or the
  cache will hide the failure.
- **`api` is still accepted by `applyConfig`** but is not in the public type; it exists
  so the tests can run without a network.
- **Timers shorten under `__DEV__`** (feed 30s, flush 60s vs 1h/1h) so an integrator
  sees their first idea land while still looking at the screen. `RANK_CYCLE_MS` does
  *not* shorten — it is the cadence the board promises in its subtitle, and a promise
  that reads differently in dev is worse than none.
- **The feed is JSON, not Parquet.** Parquet was tried and removed: ~5KB saved on the
  wire for a few hundred rows, against ~100KB of reader in every app bundle, a Metro
  resolver override, BigInt coercion, and `generatedAt` repeated on every row because
  Parquet has no file-level scalar. Use Firestore's BigQuery export for columnar
  analytics; keep it out of the mobile read path.
- **The writes are `onRequest`, not `onCall`** — a callable wants an `{ data }`
  envelope; the module posts the object itself.
- **Both need `allUsers` as `roles/run.invoker`.** The Firebase CLI grants it on
  *create* and silently skips it on update, so changing a trigger type on an existing
  name keeps the old unbound Run service and answers 403 while the app reports nothing.
  Delete the function and redeploy. If writes seem to vanish, check Run IAM first.

## Expo 57 / RN 0.82 — read the versioned docs## Expo 57 / RN 0.82 — read the versioned docs## Expo 57 / RN 0.82 — read the versioned docs

`https://docs.expo.dev/versions/v57.0.0/` before writing code. One trap already cost
an afternoon:

- **`StyleSheet.absoluteFillObject` was removed in RN 0.82.** Only `absoluteFill`
  survives (a plain object, `Libraries/StyleSheet/StyleSheetExports.js`). Spreading the
  removed one **typechecks and then spreads `undefined`**, producing an unpositioned,
  zero-height view that renders nothing and reports no error — it cost a full debugging
  cycle on a scrim that would not paint. Spell absolute fills out, four offsets by hand
  (`src/constants/styles.ts` → `scrim`).
- Nested `Modal`s work (the composer sheet stacks over the board sheet), and each
  sheet mounts its own `SafeAreaProvider` with `initialWindowMetrics` so consumers are
  not required to have one at their root.

## Things that look like bugs and are not

- **A vote does not reorder the list.** `orderAtom` holds the settled order until the
  list remounts or a new feed lands, so a row never jumps out from under a finger.
- **A 0-vote idea sits above voted ones.** `score = likes + boost × 2^−(age/rankCycleMs)`,
  where `boost` is the 75th percentile of the votes on the board. A newcomer gets one
  publish cycle of exposure, then decays to its own votes. See `src/utils/rank.ts`.
- **The mock backend never records anything.** `api.mock.ts` returns a fixed feed, so a
  vote pushed and pruned appears to "lose" its +1 after a refresh. Real backends
  aggregate; the mock does not.
- **Drafts stay pinned at the top for 30 days** (`DRAFT_TTL_MS`) unless the feed
  publishes an item with the same `uid`.

## Invariants worth protecting

The first three are what make this thing installable. They cost one integration each
when they were missing, and none of them fails loudly.

- **The module owns its jotai store** (`atoms/store.ts`), and every hook passes
  `{ store: feedbAIStore }`. `useAtomValue` otherwise resolves its store from React
  context, so an app with its own `<Provider>` would read one store while sync wrote to
  another: a board that is permanently empty, votes that never flush, and no error
  anywhere. Never reach for `getDefaultStore()` here, tests included.
- **Nothing has to be called for the module to work.** `useFeedbacks` runs
  `ensureStarted()` on mount, so `<FeedbAISheet />` alone is a complete integration and
  the demo feed stands in until a `projectId` arrives. An explicit `initializeFeedbAI`
  still wins, before or after. Don't reintroduce a required setup step.
- **A sync pass never rejects.** It runs from a timer nobody awaits, so a rejection
  lands in the consumer's app as an unhandled promise the first time a user loses
  signal. `syncFeedbAI`/`flushNow` catch and hand it to `onError`; the HTTP transport
  resolves to `null`/`false` rather than throwing. Pinned in `__tests__/config.test.ts`.
- **Every id is minted on the device** — `deviceId` and `local_<uuid>` in
  `src/atoms/user.ts`, both from `uuid()` in `utils/format.ts`. Because the client owns
  a feedback's `uid`, the write endpoint is an idempotent upsert and `sync.prune()` can
  retire a draft the moment the feed publishes that uid. If the backend ever re-issues
  ids on publish, users see their idea twice. Tests pin this in `__tests__/sync.test.ts`.
- **The board's subtitle is generated from `rankCycleMs`** (`cadenceLabel`), so the
  cadence it promises cannot drift from the cadence it ranks by. Don't hardcode it back.
- **Copy is friendly and specific**, and asks for what the user *wants* rather than for
  "feedback": "I wish this app could…", "Sent — we're reading it". Every string is a
  prop with that default.
- **Rows keep their object identity** when nothing about them changed (`stabilize()` in
  `atoms/data.ts`), so one vote re-renders one row. Adding a field to `FeedbackItem`
  means adding it to the signature — and `forgetExcept` keeps that cache from growing
  into every idea the session has ever seen.
- **Native modules stay peer dependencies**, with ranges rather than exact pins. An
  exact pin in `dependencies` installs a second copy of `react-native-svg` beside the
  host app's: Metro bundles both, autolinking links one. `expo-application` is optional
  and `require`d lazily inside `utils/appId.ts`, so an app that names itself never
  loads it at all.

## Author

Binni Cordova — [BinniCordova.com](https://BinniCordova.com). The README is a product
page as much as documentation: it leads with the AI continuous-improvement loop, keeps
the hero/loop images from `docs/media/`, and credits the author. Keep that framing when
you edit it, and keep the claim honest — this module is the in-app half; the agent runs
on the backend in `example/functions/`.
