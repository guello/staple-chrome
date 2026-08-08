---
description: 'Use when editing a feature under src/features. The behaviors each feature deliberately implements, why they look overbuilt, what would regress if simplified, and the manual acceptance checks per feature.'
applyTo: 'src/features/**'
paths:
  - 'src/features/**'
---

# Feature invariants

Both features replace a popular extension whose public issues named the defects. The code below looks defensive on purpose: every guard here is a fix for something that actually broke in the original. Do not simplify one away without reproducing the case it covers.

Everything worth testing is a pure function in a sibling module (`mru.ts`, `moves.ts`). `index.ts` holds the Chrome API calls and is not unit testable, since the test harness stubs `chrome` with an empty object. When a change adds logic, it goes in the pure module or it goes untested.

## Tab Switch

Replaces a single-command extension that toggled between the two most recently used tabs of a window. The core is faithful; the fixes are these.

- History lives in `chrome.storage.session`, not `local`. The original wrote tab ids to disk, incognito ones included. Session storage is in memory, survives worker suspension, and clears on browser restart, which is what the original's in-memory state did accidentally.
- Every read, modify and write goes through `serialize()`. The original polled a boolean mutex every 50ms and still lost writes.
- Activation walks deeper into the history when a candidate tab is gone, instead of failing silently on a closed tab.
- The history is event sourced from `tabs.onActivated`, `windows.onFocusChanged` (normal windows only, ignoring `WINDOW_ID_NONE`), `tabs.onAttached`, `tabs.onRemoved` and `windows.onRemoved`. `onAttached` remaps the entry rather than dropping it, so a dragged tab keeps its place.
- `MAX_ENTRIES_PER_WINDOW` caps growth per window; closing a window prunes its entries.
- `tabSwitch.scope` is `window` by default, which is the original behavior. `global` was the most requested variant and focuses the target window along with the tab.

Acceptance, checked by hand with the extension loaded: the shortcut toggles A and B on repeated presses; two windows keep separate histories; stopping the worker from `chrome://serviceworker-internals` does not lose the history; closing the tab you would land on sends you to the next live one.

## Tab Shift

Replaces a four-command extension. Same four commands, same clamping, plus fixes for its open issues.

- Moves operate on the whole highlighted selection and preserve its order: leftward moves iterate left to right, rightward moves right to left. `planShift()` sorts for this.
- Moves clamp at the strip edges. Wrapping happens only with `tabShift.wrap` on, and moves the whole block to the far end.
- Next window and undock consider `type: 'normal'` windows only and never cross the incognito boundary, because Chrome rejects a `tabs.move` across it.
- Next window with no other eligible window creates one when `tabShift.createWindow` is on, rather than doing nothing.
- Undock is a no-op when the selection is every tab in the window: moving them all would leave an empty window behind.
- Pinned tabs are re-pinned after a cross-window move. Chrome drops the pinned state and the original never restored it.
- After a selection leaves a window, `restoreSourceActiveTab()` picks which tab takes over instead of letting Chrome decide, and `reselect()` restores the highlight in the destination so a multi-tab selection survives.
- Tab groups follow Chrome's native `tabs.move` semantics: moving inside a group stays in it, moving past the group edge ejects, and cross-window moves ungroup. This is what a dragged tab does, so assert it rather than working around it.

Acceptance, checked by hand: single and multi-tab moves in both directions; undock with a selection; next window cycling across three normal windows while skipping an app window; a profile with one window creating a second one.

## Planned, deliberately out of scope

Cycling deeper than two tabs on repeated Tab Switch presses, and a searchable tab list. Both were cut from v1 on purpose. The row anatomy in `chrome-ui.instructions.md` is the blueprint for the list.
