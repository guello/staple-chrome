import assert from 'node:assert/strict'
import test from 'node:test'

import { type TabPosition, type WindowSummary, eligibleWindowIds, nextWindowId, planShift } from './moves'

const selection = (...indexes: number[]): TabPosition[] => indexes.map(index => ({ id: index + 1, index }))

const window = (id: number, type: string, incognito = false): WindowSummary => ({ id, type, incognito })

test('moves a single tab one position at a time', () => {
  assert.deepEqual(planShift(selection(2), 5, 'left', false), [{ id: 3, index: 1 }])
  assert.deepEqual(planShift(selection(2), 5, 'right', false), [{ id: 3, index: 3 }])
})

test('moves a block leftwards from its first tab and rightwards from its last', () => {
  assert.deepEqual(planShift(selection(1, 2), 5, 'left', false), [
    { id: 2, index: 0 },
    { id: 3, index: 1 },
  ])
  assert.deepEqual(planShift(selection(1, 2), 5, 'right', false), [
    { id: 3, index: 3 },
    { id: 2, index: 2 },
  ])
})

test('stops at the edges', () => {
  assert.deepEqual(planShift(selection(0, 1), 5, 'left', false), [])
  assert.deepEqual(planShift(selection(3, 4), 5, 'right', false), [])
})

test('sends the block to the other end when wrapping is on', () => {
  assert.deepEqual(planShift(selection(0, 1), 5, 'left', true), [
    { id: 1, index: 4 },
    { id: 2, index: 4 },
  ])
  assert.deepEqual(planShift(selection(3, 4), 5, 'right', true), [
    { id: 5, index: 0 },
    { id: 4, index: 0 },
  ])
})

test('treats a selection touching the edge as one block', () => {
  assert.deepEqual(planShift(selection(0, 3), 5, 'left', false), [])
  assert.deepEqual(planShift(selection(0, 3), 5, 'right', false), [
    { id: 4, index: 4 },
    { id: 1, index: 1 },
  ])
})

test('does nothing when the selection is the whole window', () => {
  assert.deepEqual(planShift(selection(0, 1, 2), 3, 'left', true), [])
  assert.deepEqual(planShift([], 3, 'right', false), [])
})

test('only offers normal windows on the same side of the incognito boundary', () => {
  const source = window(1, 'normal')
  const windows = [source, window(2, 'normal'), window(3, 'popup'), window(4, 'normal', true)]

  assert.deepEqual(eligibleWindowIds(windows, source), [2])
})

test('cycles through the eligible windows in a stable order', () => {
  assert.equal(nextWindowId([2, 3], 1), 2)
  assert.equal(nextWindowId([1, 3], 2), 3)
  assert.equal(nextWindowId([1, 2], 3), 1)
  assert.equal(nextWindowId([], 1), undefined)
})
