import { type MruState, activateTab, candidates, isMruState, moveTab, removeTab, removeWindow } from './mru'

import { registerCommand } from '@/lib/commands'
import { getSettings } from '@/lib/settings'

const STORAGE_KEY = 'tabSwitch.mru'

let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs tasks one after another. The service worker handles tab events concurrently, so every read, mutate and write of
 * the history has to go through here or the last writer wins and entries are lost.
 */
const serialize = <T>(task: () => Promise<T>): Promise<T> => {
  const run = async (): Promise<T> => {
    try {
      await queue
    } catch {}
    return task()
  }
  const result = run()
  queue = result
  return result
}

const readState = async (): Promise<MruState> => {
  const stored: Record<string, unknown> = await chrome.storage.session.get(STORAGE_KEY)
  const state = stored[STORAGE_KEY]
  return isMruState(state) ? state : []
}

const writeState = async (state: MruState): Promise<void> => {
  await chrome.storage.session.set({ [STORAGE_KEY]: state })
}

const update = (mutate: (state: MruState) => MruState): Promise<void> =>
  serialize(async () => {
    await writeState(mutate(await readState()))
  })

const switchTab = async (): Promise<void> => {
  const settings = await getSettings()
  if (!settings['tabSwitch.enabled']) return

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (active?.id === undefined) return

  const state = await serialize(readState)

  for (const tabId of candidates(state, settings['tabSwitch.scope'], active.windowId, active.id)) {
    try {
      const tab = await chrome.tabs.get(tabId)
      await chrome.tabs.update(tabId, { active: true })
      if (tab.windowId !== active.windowId) await chrome.windows.update(tab.windowId, { focused: true })
      return
    } catch {
      await update(current => removeTab(current, tabId))
    }
  }
}

export const registerTabSwitch = (): void => {
  chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
    void update(state => activateTab(state, { tabId, windowId }))
  })

  chrome.windows.onFocusChanged.addListener(
    windowId => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return
      void serialize(async () => {
        const [active] = await chrome.tabs.query({ active: true, windowId })
        if (active?.id === undefined) return
        await writeState(activateTab(await readState(), { tabId: active.id, windowId }))
      })
    },
    { windowTypes: ['normal'] }
  )

  chrome.tabs.onAttached.addListener((tabId, { newWindowId }) => {
    void update(state => moveTab(state, tabId, newWindowId))
  })

  chrome.tabs.onRemoved.addListener(tabId => {
    void update(state => removeTab(state, tabId))
  })

  chrome.windows.onRemoved.addListener(windowId => {
    void update(state => removeWindow(state, windowId))
  })

  registerCommand('tab-switch', switchTab)
}
