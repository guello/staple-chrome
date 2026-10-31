import { type TabSwitchScope } from '@/lib/settings'

export interface MruEntry {
  readonly tabId: number
  readonly windowId: number
}

/** Most recently used tabs, most recent first, across every window. */
export type MruState = MruEntry[]

export const MAX_ENTRIES_PER_WINDOW = 100

export const activateTab = (state: MruState, entry: MruEntry): MruState => {
  const next: MruState = [entry]
  let windowEntries = 1

  for (const item of state) {
    if (item.tabId === entry.tabId) continue
    if (item.windowId === entry.windowId) {
      if (windowEntries >= MAX_ENTRIES_PER_WINDOW) continue
      windowEntries += 1
    }
    next.push(item)
  }

  return next
}

export interface AccessedTab extends MruEntry {
  readonly lastAccessed: number
}

/**
 * Rebuilds the history from Chrome's own access times, for when session storage starts empty after an install, a
 * reload or a browser restart. Entries already recorded stay ahead of the seeded ones, so an activation that lands
 * before the seed is not pushed back.
 */
export const seedState = (state: MruState, tabs: AccessedTab[]): MruState => {
  let next: MruState = []
  for (const { tabId, windowId } of [...tabs].sort((a, b) => a.lastAccessed - b.lastAccessed)) {
    next = activateTab(next, { tabId, windowId })
  }
  for (let index = state.length - 1; index >= 0; index -= 1) {
    next = activateTab(next, state[index])
  }
  return next
}

export const removeTab = (state: MruState, tabId: number): MruState => state.filter(entry => entry.tabId !== tabId)

export const removeWindow = (state: MruState, windowId: number): MruState =>
  state.filter(entry => entry.windowId !== windowId)

export const moveTab = (state: MruState, tabId: number, windowId: number): MruState =>
  state.map(entry => (entry.tabId === tabId ? { tabId, windowId } : entry))

export const candidates = (state: MruState, scope: TabSwitchScope, windowId: number, activeTabId: number): number[] =>
  state
    .filter(entry => entry.tabId !== activeTabId && (scope === 'global' || entry.windowId === windowId))
    .map(entry => entry.tabId)

export const isMruState = (value: unknown): value is MruState =>
  Array.isArray(value) &&
  value.every(entry => {
    if (typeof entry !== 'object' || entry === null) return false
    const item = entry as Partial<MruEntry>
    return typeof item.tabId === 'number' && typeof item.windowId === 'number'
  })
