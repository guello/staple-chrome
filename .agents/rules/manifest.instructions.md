---
description: 'Use when editing manifest.json: the shortcut budget and the platform rules Chrome enforces on commands, the permission policy, and the fields that must stay in sync with the source and the build target.'
applyTo: 'manifest.json'
paths:
  - 'manifest.json'
---

# Manifest

`manifest.json` at the repository root is the source of truth. `scripts/build.mts` copies it into `dist/` untouched, so nothing generates or rewrites it.

## Shortcuts

Chrome allows any number of declared commands but at most four `suggested_key` defaults per extension. All four are spent, so a new default has to displace one and the extra command ships unbound, with the user assigning it at `chrome://extensions/shortcuts`.

| Command                 | Default               | Why                                                                             |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `tab-switch`            | `Alt+Q`               | Same key as the extension this replaces, and free on every platform.            |
| `tab-shift-left`        | `Ctrl+Shift+PageUp`   | The Firefox and Vivaldi move-tab key. `Ctrl+Shift+Left` shadows word selection. |
| `tab-shift-right`       | `Ctrl+Shift+PageDown` | Same.                                                                           |
| `tab-shift-next-window` | `Alt+Shift+M`         | `Ctrl+Shift+M` collides with Chrome's profile switcher.                         |
| `tab-shift-undock`      | none                  | Least used, so it is the one left unbound.                                      |

Rules Chrome enforces, all of which reject the manifest or silently drop the binding:

- A shortcut must include `Ctrl` or `Alt`. `Ctrl+Alt` combinations are invalid.
- On macOS, `Ctrl` in the manifest maps to Command automatically. `MacCtrl` forces Control but breaks the other platforms, so avoid it.
- Chrome wins every conflict with its own shortcuts, so a default that collides is simply dead. `Ctrl+Shift+A` is Chrome's tab search and cannot be claimed. Verify a new default against Chrome's list and leave the command unbound rather than shipping a binding that never fires.
- `_execute_action` opens the popup but never fires `onCommand`. The popup bootstraps on load instead.

Every `commands` key must exist in `COMMAND_IDS` in `src/lib/commands.ts`, and every id there needs a `PRESENTATION` entry in `src/action/action.ts`. Nothing checks the manifest against the source at build time, so this is manual.

## Permissions

`storage` is the only permission, and adding one is a decision to justify in the commit that adds it. Everything the extension does today is permission-free: `chrome.tabs.query`, `move`, `update` and `highlight`, `chrome.windows.*`, and the commands API all work without host or tab permissions as long as the code never reads `tab.url`, `tab.title` or `tab.favIconUrl`. Reading any of those requires the `tabs` permission and turns a silent install into one that warns about reading browsing history. A future tab list needs `tabs` plus `favicon`, and that tradeoff belongs in its own commit.

## Fields that pair with something else

- `minimum_chrome_version` is `102` and `scripts/build.mts` targets `chrome102`. Change both together, and only after checking the `@since` of every Chrome API in use.
- `version` is the store version; `package.json` `version` names the zip that `scripts/package.mts` produces. Keep them equal.
- `background.type` is `module`, matching esbuild's `format: 'esm'` output.
- Paths in `action`, `options_ui` and `icons` are resolved inside `dist/`, so they mirror the `outbase: 'src'` layout, not the repository layout. `media` is the one path that is the same in both.
