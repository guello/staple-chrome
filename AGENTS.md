# Staple

Manifest V3 Chrome extension collecting small tab utilities behind keyboard commands. It is the Chrome counterpart of [staple-vscode](https://github.com/guello/staple-vscode), whose standard this repository follows: minimal dependencies, hand-written build scripts, oxfmt plus oxlint plus knip plus tsc as the only gates, one folder per feature with an `enabled` setting, conventional commits.

## Commands

Node 24.18.0 through nodenv (`.node-version`), pnpm 11.17.0 through Corepack (`packageManager`). Long commands live in `scripts/`, run by Node directly.

| Command        | What it runs                                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| `pnpm check`   | oxfmt check, knip, oxlint and `tsc --noEmit` in parallel. Green before every commit. |
| `pnpm test`    | esbuild bundles every `src/**/*.test.ts` and runs each on `node:test`.               |
| `pnpm build`   | esbuild bundles the three entry points into `dist/` and copies the static files.     |
| `pnpm watch`   | Rebuilds on change. No HMR: reload from `chrome://extensions` afterwards.            |
| `pnpm package` | check, test, build, then zips `dist/` into `staple-chrome-<version>.zip`.            |
| `pnpm fix`     | Lint fixes plus formatting.                                                          |

`.githooks/pre-commit` runs `pnpm check` and `pnpm test`; `pnpm install` points git at it through the `prepare` script.

## Architecture

`src/background.ts` is the service worker. It calls one `registerX()` per feature, then routes both `chrome.commands.onCommand` and the `run-command` message through the handler registry in `src/lib/commands.ts`. Extension pages cannot call feature code directly, so the popup asks the worker over `chrome.runtime.sendMessage`.

A feature is a folder under `src/features/`. Its `index.ts` exports `register<Name>(): void` and owns every Chrome API call; sibling modules hold the decisions as pure functions (`mru.ts`, `moves.ts`) with a colocated `*.test.ts`. Only those pure modules are testable, since the harness stubs `chrome` with an empty object.

`src/lib/` is the shared layer: `commands.ts` (id union and handler registry), `settings.ts` (typed schema over `chrome.storage.sync`), `features.ts` (display metadata), `messages.ts` (the single message type). `src/ui/` holds the tokens and DOM helpers that `src/action/` (popup) and `src/options/` (settings page) share.

### Service worker rules

- Register every listener synchronously at the top level of `registerX()`. A listener added inside a promise callback is lost when Chrome restarts the worker.
- Nothing survives in memory. Chrome stops the worker after roughly 30 seconds idle, so state that must outlive an event goes to `chrome.storage.session` and everything else is recomputed from live `chrome.tabs` and `chrome.windows` queries.
- Serialize every read, modify and write of stored state through one promise chain (`serialize()` in `src/features/tab-switch/index.ts`). Tab events arrive concurrently and the last write wins otherwise.
- `chrome.storage.session` for state, `chrome.storage.sync` for settings. Tab ids never reach disk, which is what keeps incognito ids off it.
- Every handler reads its feature's `enabled` setting first and returns early when it is off. The popup hides disabled tools, but a shortcut reaches the handler regardless.

## Hard rules

- Manifest V3 and Chrome only. Use the `chrome.*` namespace directly: no `webextension-polyfill`, no `browser.*`.
- No UI framework and no runtime dependency. Everything shipped is vanilla TypeScript and hand-written CSS. New dependencies are dev-only and need a reason a platform API cannot cover.
- `storage` is the only permission. Moving, querying and activating tabs need none, and neither does the commands API. Justify any new permission in the commit that adds it.
- Tab titles and URLs are untrusted. Build DOM through `element()` and `icon()` in `src/ui/dom.ts`, which set `textContent`. Never `innerHTML`.
- No network at runtime: no remote fonts, scripts or favicons. The popup has to paint instantly.
- oxfmt, oxlint, knip and tsc own formatting and style. Run `pnpm fix` instead of hand-fixing.
- No em or en dash in a committed file. No machine-specific absolute path in a committed file.

## Adding a command

Five places have to agree. Only one link is typechecked: a new `COMMAND_IDS` entry fails the build until the popup has a row for it. Nothing compares the manifest to the source.

1. `manifest.json` `commands`: id, description, optional `suggested_key`. Chrome accepts at most four defaults across the whole extension and all four are taken, so a new default has to displace an existing one.
2. `COMMAND_IDS` in `src/lib/commands.ts`.
3. `registerCommand(id, handler)` inside the owning feature's `registerX()`.
4. `PRESENTATION` in `src/action/action.ts`: label plus an inline icon path. The record is keyed by `CommandId`, so a missing entry fails the typecheck.
5. The shortcuts table in `README.md`.

## Adding a feature

1. `src/features/<name>/index.ts` exporting `register<Name>()`, called from `src/background.ts`.
2. `src/lib/settings.ts`: `<feature>.enabled` and its other keys in `Settings`, `BooleanSettingKey`, the defaults and the `getSettings` mapping, which parses key by key and falls back to the default rather than spreading stored values in.
3. `src/lib/features.ts`: name, one-line description, enabled key.
4. `src/options/options.ts`: a `SETTINGS` entry. The record is keyed by `FeatureId`, so a missing one fails the typecheck.
5. A README section with a settings table.

A new entry point also goes in `knip.json` `entry`, and a new static file in `staticFiles` in `scripts/build.mts`.

## Verifying behavior

`pnpm check` and `pnpm test` cover the pure logic only. Anything touching Chrome needs the extension loaded: `pnpm build`, then `chrome://extensions` with Developer mode on and Load unpacked pointed at `dist/`.

Keyboard shortcuts cannot be synthesized from page automation. Exercise a handler as the popup does, by sending `{ type: 'run-command', command: '<id>' }` over `chrome.runtime.sendMessage` from an extension page or the worker console, then assert with `chrome.tabs.query`. Real shortcuts need a human or OS-level automation.

Stop the worker from `chrome://serviceworker-internals` to confirm state survives a restart. Check the popup and the options page in both color schemes: they follow the OS scheme only and never the Chrome theme, because `chrome://theme` is unreachable from an extension.

## Read next

Rules also load on their path glob in Claude Code and Copilot; other agents read them from here.

| File                                      | When                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `.agents/rules/features.instructions.md`  | Editing `src/features/`. Deliberate behaviors that must not be simplified away. |
| `.agents/rules/chrome-ui.instructions.md` | Editing `src/ui/`, `src/action/` or `src/options/`.                             |
| `.agents/rules/manifest.instructions.md`  | Editing `manifest.json`.                                                        |
| `.agents/references/stack-decisions.md`   | Changing the build, the test runner, the types or the platform baseline.        |
| `.agents/references/release.md`           | Packaging, tagging, publishing, and where the release stands.                   |
