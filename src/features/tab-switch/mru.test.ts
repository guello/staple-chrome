import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_ENTRIES_PER_WINDOW,
  type MruState,
  activateTab,
  candidates,
  isMruState,
  moveTab,
  removeTab,
  removeWindow,
} from './mru'

const history = (...entries: [tabId: number, windowId: number][]): MruState =>
  entries.map(([tabId, windowId]) => ({ tabId, windowId }))

test('puts the activated tab first and keeps a single entry per tab', () => {
  let state = history()
  state = activateTab(state, { tabId: 1, windowId: 10 })
  state = activateTab(state, { tabId: 2, windowId: 10 })
  state = activateTab(state, { tabId: 1, windowId: 10 })

  assert.deepEqual(state, history([1, 10], [2, 10]))
})

test('offers the previously used tab of the same window first', () => {
  const state = history([3, 10], [2, 10], [1, 10])

  assert.deepEqual(candidates(state, 'window', 10, 3), [2, 1])
})

test('keeps windows apart in window scope and merges them in global scope', () => {
  const state = history([4, 20], [3, 10], [2, 20], [1, 10])

  assert.deepEqual(candidates(state, 'window', 10, 3), [1])
  assert.deepEqual(candidates(state, 'global', 10, 3), [4, 2, 1])
})

test('walks deeper into the history when the closest tab is gone', () => {
  const state = removeTab(history([3, 10], [2, 10], [1, 10]), 2)

  assert.deepEqual(candidates(state, 'window', 10, 3), [1])
})

test('drops every entry of a closed window', () => {
  const state = removeWindow(history([3, 20], [2, 10], [1, 20]), 20)

  assert.deepEqual(state, history([2, 10]))
})

test('follows a tab dragged into another window', () => {
  const state = moveTab(history([2, 20], [1, 10]), 1, 20)

  assert.deepEqual(state, history([2, 20], [1, 20]))
  assert.deepEqual(candidates(state, 'window', 20, 2), [1])
})

test('caps a window at its entry limit without touching other windows', () => {
  let state = history([999, 20])
  for (let tabId = 0; tabId <= MAX_ENTRIES_PER_WINDOW; tabId += 1) {
    state = activateTab(state, { tabId, windowId: 10 })
  }

  assert.equal(state.filter(entry => entry.windowId === 10).length, MAX_ENTRIES_PER_WINDOW)
  assert.deepEqual(state.at(-1), { tabId: 999, windowId: 20 })
  assert.equal(state.at(-2)?.tabId, 1)
})

test('rejects anything that is not a stored history', () => {
  assert.equal(isMruState(history([1, 10])), true)
  assert.equal(isMruState([]), true)
  assert.equal(isMruState('history'), false)
  assert.equal(isMruState([{ tabId: '1', windowId: 10 }]), false)
})
