---
description: 'Use when building or editing the extension surfaces (src/ui, src/action, src/options). Chrome GM3 tokens, tab search and settings metrics, dark mode and instant paint requirements, DOM safety for untrusted tab data, and the row anatomy to reuse for a future tab list.'
applyTo: 'src/ui/**, src/action/**, src/options/**'
paths:
  - 'src/ui/**'
  - 'src/action/**'
  - 'src/options/**'
---

# Chrome-native UI

The popup and the options page should read as an extension of Chrome, not as a web page inside it. Every value below was read from Chromium source in August 2026: `chrome/browser/resources/tab_search/` (`tab_search.html`, `tab_search_item.css`, `tab_search_page.css`), `mwb_shared_vars.css` and `cr_shared_vars.css`, plus the `chrome://settings` card and toggle metrics.

Hand-rolled CSS is the only option here. Chromium's `cr-*` elements are not published on npm and depend on `chrome://` schemes an extension cannot load, and `@material/web` has been in maintenance mode since mid-2024.

## Tokens

`src/ui/chrome.css` is the single place a color lives. Add a `--st-*` custom property there and reference it; never hardcode a color in `action.css` or `options.css`, and never introduce a second palette. Dark values come from the same file under `@media (prefers-color-scheme: dark)`.

| Token                     | Light                    | Dark                        |
| ------------------------- | ------------------------ | --------------------------- |
| `--st-primary`            | `#0b57d0`                | `#a8c7fa`                   |
| `--st-on-primary`         | `#ffffff`                | `#062e6f`                   |
| `--st-surface`            | `#ffffff`                | `#1f1f1f`                   |
| `--st-surface-1`          | `#f8fafd`                | `#27282a`                   |
| `--st-surface-2`          | `#f3f6fc`                | `#2d2f31`                   |
| `--st-on-surface`         | `#1f1f1f`                | `#e3e3e3`                   |
| `--st-on-surface-variant` | `#444746`                | `#c4c7c5`                   |
| `--st-outline`            | `#747775`                | `#8e918f`                   |
| `--st-divider`            | `rgba(0, 0, 0, 0.14)`    | `#5e5e5e`                   |
| `--st-hover`              | `rgba(31, 31, 31, 0.06)` | `rgba(253, 252, 251, 0.1)`  |
| `--st-pressed`            | `rgba(31, 31, 31, 0.12)` | `rgba(253, 252, 251, 0.16)` |

The GM3 palette also defines `primary-container` (`#d3e3fd` light, `#0842a0` dark) and `error` (`#b3261e` light, `#f2b8b5` dark). Add them when a surface needs them, not before.

## Metrics

- Popup width is fixed at `320px` on `html, body`, the same as Chrome's tab search bubble. Height follows content; Chrome hard caps a popup at 800 by 600 CSS pixels.
- Rows are `48px` with `20px` inline padding (`--st-row-height`, `--st-inline-padding`). Fixed heights matter: a row that grows while an icon loads shifts the whole list.
- Row icon container is 40 by 40 with `--st-radius` (8px) and a `16px` inline-end margin; the glyph inside is 16px and inherits `currentcolor`.
- Text buttons are `36px` tall and pill shaped. Cards use `--st-radius`. Section headers are `48px` tall at 11px.
- Focus ring is `2px solid var(--st-primary)` with `2px` offset, applied globally through `:focus-visible`. Disabled content uses `--st-disabled-opacity` (`.38`) plus `pointer-events: none`, which is what `.st-disabled` does.
- Toggle metrics follow `cr-toggle`: 34 by 14 track, 16px thumb, 80ms linear transition, checked track at 50 percent primary.

## Typography

`system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`. Base is 12px because Chrome WebUI renders at 75 percent of 16px. Row titles are 13px, secondary text 11px, section headers 11px at weight 500.

## Dark mode and instant paint

Every HTML surface needs `<meta name="color-scheme" content="light dark">`, `color-scheme: light dark` on `:root`, and an inline `<style>` in `<head>` setting the `html` background for both schemes. Without the inline style the user agent canvas flashes white before the stylesheet paints. `src/action/action.html` is the reference.

Extension surfaces follow the OS color scheme only. A user running a dark Chrome theme under a light system will see a light popup, and there is no API to fix it: accept the mismatch.

Keep the surface to one small bundle and local CSS. No network request, no web font, no remote image. If favicons are ever needed, they come from `chrome-extension://<id>/_favicon/?pageUrl=<url>&size=16`, which requires the `favicon` permission and stays local.

## DOM

Build nodes with `element()` and `icon()` from `src/ui/dom.ts`. `element()` sets `textContent`, which is the whole point: tab titles and URLs are attacker-controlled strings and `innerHTML` on them is an injection. Icons are inline SVG path data in the module that renders them, so there is no icon font and no sprite fetch.

Popup logic sends `{ type: 'run-command', command }` to the worker and closes on success; it never imports feature code, since extension pages and the service worker are separate contexts.

## Row anatomy for a future tab list

This is the Chromium tab search layout, kept here as the blueprint for the planned searchable tab list rather than as a description of current code.

- Search field: 60px tall, `0 20px` padding, leading 16px search icon with a 12px gap, secondary-colored placeholder, `autofocus`.
- Row: 48px, favicon in the 40 by 40 container, title 13px in one line with ellipsis, domain line 12px in secondary color with `direction: rtl` so it elides from the front, which is Chrome's anti-spoofing trick. Stack gap 3px. Close button appears on `:hover` or when the row is selected.
- Section headers ("Open tabs", "Recently closed") stick to the top and sit above a 1px separator. Scrollbar is 4px.
- Selected row background is `rgba(32, 33, 36, .14)` light and `rgb(68, 69, 71)` dark, one step darker than hover.
