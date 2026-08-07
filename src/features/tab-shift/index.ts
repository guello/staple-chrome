import { type ShiftDirection, type WindowSummary, eligibleWindowIds, nextWindowId, planShift } from './moves'

import { registerCommand } from '@/lib/commands'
import { getSettings } from '@/lib/settings'

interface SelectedTab {
  readonly id: number
  readonly index: number
  readonly pinned: boolean
}

interface Selection {
  readonly tabs: SelectedTab[]
  readonly windowId: number
  readonly total: number
  readonly holdsActiveTab: boolean
}

const toSelectedTabs = (tabs: chrome.tabs.Tab[]): SelectedTab[] =>
  tabs
    .filter(tab => tab.id !== undefined && tab.id !== chrome.tabs.TAB_ID_NONE)
    .map(tab => ({ id: tab.id!, index: tab.index, pinned: tab.pinned }))
    .sort((a, b) => a.index - b.index)

const toWindowSummaries = (windows: chrome.windows.Window[]): WindowSummary[] =>
  windows.filter(window => window.id !== undefined).map(({ id, type, incognito }) => ({ id: id!, type, incognito }))

const readSelection = async (): Promise<Selection | undefined> => {
  const [highlighted, all] = await Promise.all([
    chrome.tabs.query({ currentWindow: true, highlighted: true }),
    chrome.tabs.query({ currentWindow: true }),
  ])

  const tabs = toSelectedTabs(highlighted)
  const first = tabs[0]
  if (!first) return undefined

  const active = all.find(tab => tab.active)
  return {
    tabs,
    windowId: highlighted[0].windowId,
    total: all.length,
    holdsActiveTab: active?.id !== undefined && tabs.some(tab => tab.id === active.id),
  }
}

const repin = async (tabs: readonly SelectedTab[]): Promise<void> => {
  for (const tab of tabs) {
    if (tab.pinned) await chrome.tabs.update(tab.id, { pinned: true })
  }
}

/** Reselects the moved tabs in their new window so a multi-tab selection survives the move. */
const reselect = async (windowId: number, selection: Selection): Promise<void> => {
  const ids = new Set(selection.tabs.map(tab => tab.id))
  const tabs = await chrome.tabs.query({ windowId })
  const indexes = tabs.filter(tab => tab.id !== undefined && ids.has(tab.id)).map(tab => tab.index)
  if (indexes.length > 0) await chrome.tabs.highlight({ windowId, tabs: indexes })
}

/** Picks the tab that takes over in the window the selection left, instead of letting Chrome choose. */
const restoreSourceActiveTab = async (selection: Selection): Promise<void> => {
  if (!selection.holdsActiveTab || selection.tabs.length >= selection.total) return

  const remaining = await chrome.tabs.query({ windowId: selection.windowId })
  const index = Math.min(selection.tabs[0].index, remaining.length - 1)
  const target = remaining.find(tab => tab.index === index) ?? remaining.at(-1)
  if (target?.id !== undefined) await chrome.tabs.update(target.id, { active: true })
}

const moveToNewWindow = async (selection: Selection): Promise<void> => {
  const [first, ...rest] = selection.tabs
  const created = await chrome.windows.create({ tabId: first.id, focused: true })
  const targetId = created?.id
  if (targetId === undefined) return

  for (const [offset, tab] of rest.entries()) {
    await chrome.tabs.move(tab.id, { windowId: targetId, index: offset + 1 })
  }

  await repin(selection.tabs)
  await restoreSourceActiveTab(selection)
  await reselect(targetId, selection)
}

const shift = async (direction: ShiftDirection): Promise<void> => {
  const settings = await getSettings()
  if (!settings['tabShift.enabled']) return

  const selection = await readSelection()
  if (!selection) return

  for (const move of planShift(selection.tabs, selection.total, direction, settings['tabShift.wrap'])) {
    await chrome.tabs.move(move.id, { index: move.index })
  }
}

const undock = async (): Promise<void> => {
  const settings = await getSettings()
  if (!settings['tabShift.enabled']) return

  const selection = await readSelection()
  if (!selection || selection.tabs.length >= selection.total) return

  await moveToNewWindow(selection)
}

const moveToNextWindow = async (): Promise<void> => {
  const settings = await getSettings()
  if (!settings['tabShift.enabled']) return

  const selection = await readSelection()
  if (!selection) return

  const source = await chrome.windows.get(selection.windowId)
  if (source.type !== 'normal' || source.id === undefined) return

  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
  const eligible = eligibleWindowIds(toWindowSummaries(windows), {
    id: source.id,
    type: source.type,
    incognito: source.incognito,
  })
  const targetId = nextWindowId(eligible, source.id)

  if (targetId === undefined) {
    if (settings['tabShift.createWindow'] && selection.tabs.length < selection.total) await moveToNewWindow(selection)
    return
  }

  for (const tab of selection.tabs) await chrome.tabs.move(tab.id, { windowId: targetId, index: -1 })

  await repin(selection.tabs)
  await chrome.windows.update(targetId, { focused: true })
  await restoreSourceActiveTab(selection)
  await reselect(targetId, selection)
}

export const registerTabShift = (): void => {
  registerCommand('tab-shift-left', () => shift('left'))
  registerCommand('tab-shift-right', () => shift('right'))
  registerCommand('tab-shift-next-window', moveToNextWindow)
  registerCommand('tab-shift-undock', undock)
}
