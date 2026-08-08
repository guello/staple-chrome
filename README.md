<div align="center">
  <img src="media/icon.svg" style="width: 80px" />

# Staple for Chrome

</div>

Essential Chrome utilities packaged as a single lightweight, performant extension.

## Features

- [Tab Switch](#tab-switch)
- [Tab Shift](#tab-shift)

Every tool is a keyboard command handled by the extension's service worker. The toolbar popup lists the tools that are on with their current shortcuts, so it doubles as a launcher when you have not memorized a key yet. The options page turns each feature on or off and holds its settings.

### Tab Switch

Jumps back to the tab you came from, and pressing the shortcut again returns you to where you were. It is the browser equivalent of alt-tab: the two tabs you use most trade places on every press.

The history is per window by default, so a shortcut pressed in one window never pulls a tab from another. Set `Switch between` to `Tabs in every window` for one history across the whole profile; the target window is focused along with the tab.

The list is rebuilt from tab and window events and lives in `chrome.storage.session`, which means it survives Chrome suspending the service worker, clears itself when the browser restarts, and never writes tab ids of incognito windows to disk. If the tab you would land on was closed while you were away, the switch walks further back until it finds one that is still open.

| Setting             | Default  | Description                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------------- |
| `tabSwitch.enabled` | `true`   | Enable the feature.                                                           |
| `tabSwitch.scope`   | `window` | `window` keeps one history per window, `global` keeps one across all of them. |

Repeated presses do not yet walk further back than two tabs, and there is no searchable tab list. Both are planned.

### Tab Shift

Moves the highlighted tabs around: one position left or right, into the next window, or out into a window of their own. Every command works on a multi-tab selection and keeps the tabs in order, and the selection stays selected after a move between windows.

Moves stop at the edges of the tab strip. Turn on `Wrap around the edges` to send a selection that is already at one end straight to the other. Pinned tabs stay pinned when they land in another window. A tab moved inside its group stays in the group, and moving it past the group's edge takes it out, which is Chrome's own behavior for a dragged tab.

The next-window command cycles through your normal windows in a stable order, so repeated presses visit each one before coming back. It never mixes an incognito window with a normal one, since Chrome rejects a move across that boundary. With a single window open it creates a second one instead of doing nothing, unless you turn that off.

| Setting                 | Default | Description                                                                        |
| ----------------------- | ------- | ---------------------------------------------------------------------------------- |
| `tabShift.enabled`      | `true`  | Enable the feature.                                                                |
| `tabShift.wrap`         | `false` | A selection at one end of the strip moves to the other end instead of staying put. |
| `tabShift.createWindow` | `true`  | Moving to the next window opens a new one when the profile has a single window.    |

## Shortcuts

Chrome allows an extension to suggest at most four default shortcuts, so the fifth command ships unbound. Assign it, or change any of the others, at `chrome://extensions/shortcuts`. On macOS `Ctrl` in the table below is `Command`.

| Command                 | Default               | Action                                     |
| ----------------------- | --------------------- | ------------------------------------------ |
| `tab-switch`            | `Alt+Q`               | Switch to the most recently used tab.      |
| `tab-shift-left`        | `Ctrl+Shift+PageUp`   | Move the selected tabs left.               |
| `tab-shift-right`       | `Ctrl+Shift+PageDown` | Move the selected tabs right.              |
| `tab-shift-next-window` | `Alt+Shift+M`         | Move the selected tabs to the next window. |
| `tab-shift-undock`      | none                  | Move the selected tabs to a new window.    |

## Install

The extension is not on the Chrome Web Store yet. Building from source needs Node 24 and pnpm, both pinned in the repository through `.node-version` and the `packageManager` field, so `corepack enable` gets you the right pnpm:

```sh
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select the `dist` folder. After a rebuild, press the reload button on the extension card.

`storage` is the only permission the extension asks for. Moving, querying and activating tabs need none, and neither do the keyboard commands.

## Development

```sh
pnpm install
pnpm check
pnpm test
pnpm build
```

`pnpm check` runs Oxfmt's check mode, Knip, Oxlint and TypeScript in parallel; `pnpm fix` applies safe lint fixes and formats the repository. `pnpm watch` rebuilds on change, and `pnpm package` runs the full gate before zipping `dist/` into a store-ready archive. A `pre-commit` hook runs `pnpm check` and `pnpm test`; `pnpm install` points git at it through the `prepare` script.

Every long-running command lives in `scripts/` and runs through Node's TypeScript support, so `package.json` only holds the entry points. `scripts/build.mts` bundles `src/background.ts`, `src/action/action.ts` and `src/options/options.ts` with esbuild and copies `manifest.json`, the HTML, the CSS and the icons into `dist/`.

`pnpm test` bundles every `src/**/*.test.ts` with esbuild and runs each bundle on Node's test runner with a stub `chrome` global, which is why the parts worth testing (the tab history reducer, the move planner) are pure functions with no Chrome API calls in them.

The extension is Manifest V3 only, so its background script is a service worker Chrome stops whenever it is idle. Nothing is kept in memory between events: every command reads what it needs from `chrome.storage`, and history writes are serialized through a single promise chain so concurrent tab events cannot overwrite each other.

The popup and options page are plain TypeScript and hand-written CSS built to look like Chrome's own surfaces, with tokens taken from the GM3 palette and metrics from Chromium's tab search bubble and `chrome://settings`. There is no UI framework and no runtime dependency.

## License

[MIT](LICENSE)
