# Stack decisions

Why the toolchain looks the way it does, and what would justify changing it. Researched in August 2026 against the npm registry and the projects' own repositories. Read this before proposing a different build tool, test runner or type package; re-research only if a trigger below actually fires.

## Contents

- [Build tooling](#build-tooling): the comparison and the choice
- [Locked stack](#locked-stack): what is in use and why
- [Platform baseline](#platform-baseline): what the extension targets

## Build tooling

Candidates were scored on their own merits first, then re-weighted for this project's constraints: parity with staple-vscode, minimal dependencies, and original Chrome patterns rather than a framework's abstractions.

| Candidate               | Generic score | Fit       | Notes                                                                                                                                                                                                                                                     |
| ----------------------- | ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom esbuild scripts  | 6/10          | Chosen    | `scripts/build.mts` and `scripts/test.mts` port almost verbatim from staple-vscode. Smallest toolchain, and a hand-written `manifest.json` is the most Chrome-native pattern there is. The cost is no HMR: rebuild and reload from `chrome://extensions`. |
| CRXJS Vite plugin 2.7.1 | 8/10          | Runner-up | Plain Vite plus a hand-owned typed manifest, real HMR, 14 dependencies, maintenance revived with a stable v2 in mid-2025.                                                                                                                                 |
| WXT 0.21.3              | 9/10          | Rejected  | Best maintained and the best testing story, but it is a framework: generated manifest, file conventions, auto imports, 35 CLI dependencies. It would replace the staple-vscode build entirely.                                                            |
| Extension.js 4.0.30     | 6/10          | Rejected  | Rspack based, installs Vue, Preact and Svelte loaders even for a vanilla TypeScript project.                                                                                                                                                              |
| Plain Vite 8.2.1        | 7/10          | Rejected  | The HMR client cannot run on `chrome-extension://` pages without CRXJS-style glue, so hand-rolling it buys nothing over esbuild.                                                                                                                          |
| Plasmo 0.90.5           | 2/10          | Rejected  | Dormant since May 2025: no commit or release in 15 months, 371 open issues.                                                                                                                                                                               |

Switch triggers, the only reasons to revisit:

- Reload friction becomes a real cost during sustained UI work: move to CRXJS, keeping the manifest hand-written.
- The extension needs to target Firefox or Safari as well, or grows many entry points such as content scripts and devtools panels: WXT earns its abstraction then.

Neither has fired. Two worker-centric features plus a small static popup and options page do not need a dev server.

## Locked stack

- **Build**: esbuild `^0.28` driven by `scripts/build.mts` on Node 24's native TypeScript support. ESM output, since the service worker is declared as `"type": "module"`.
- **Types**: `chrome-types`, Google's package generated daily from Chromium. Their README recommends it over `@types/chrome` for Manifest V3. It is listed in `tsconfig.json` `types` alongside `node`, which the scripts need.
- **Language**: TypeScript 7 with `strict`, ES2022 target and bundler module resolution, `noEmit` because esbuild does the emitting. If `tsc --noEmit` or oxlint's type-aware rules misbehave with TypeScript 7, pin `^5.9` and note why.
- **Tests**: `node:test` and `node:assert/strict`, bundled by `scripts/test.mts` with `globalThis.chrome ??= {}` as the entire stub. This is deliberate: an empty stub means anything importing Chrome APIs cannot be unit tested, which forces the testable logic into pure modules.
- **No polyfill**: Chrome ships a native promise-based `browser` namespace since Chrome 148, and `chrome.*` is already promise-based under Manifest V3. A Chrome-only extension gains nothing from `webextension-polyfill`.
- **End to end**: none installed. If a smoke test lands, Playwright's `launchPersistentContext` with `--load-extension=dist` is the approach; add the dependency only when the script is actually written.

## Platform baseline

Manifest V3 only. Manifest V2 was removed from Chrome and the store across 2025 and 2026, so there is no fallback path to maintain.

`minimum_chrome_version` is `121`, paired with esbuild's `chrome121` target. 121 is the floor set by `tab.lastAccessed`, and every other API in use is older. Raise both together, and only after checking the `@since` of the API that forces the change.

The service worker constraint shapes the whole design: Chrome terminates it after roughly 30 seconds idle. State is event-sourced into `chrome.storage.session`, and every command recomputes what it needs from live queries rather than trusting anything held in memory.
