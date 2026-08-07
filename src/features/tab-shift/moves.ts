export type ShiftDirection = 'left' | 'right'

export interface TabPosition {
  readonly id: number
  readonly index: number
}

export interface WindowSummary {
  readonly id: number
  readonly type?: string
  readonly incognito: boolean
}

/**
 * Target indexes for shifting a selection by one position, in the order the moves have to be applied. Selections that
 * already sit against the edge stay put unless wrapping is on, in which case the whole block jumps to the other end.
 */
export const planShift = (
  selection: readonly TabPosition[],
  total: number,
  direction: ShiftDirection,
  wrap: boolean
): TabPosition[] => {
  if (selection.length === 0 || selection.length >= total) return []

  const leftwards = direction === 'left'
  const ordered = [...selection].sort((a, b) => (leftwards ? a.index - b.index : b.index - a.index))
  const edge = leftwards ? 0 : total - 1

  if (ordered[0].index !== edge) {
    const step = leftwards ? -1 : 1
    return ordered.map(({ id, index }) => ({ id, index: index + step }))
  }

  return wrap ? ordered.map(({ id }) => ({ id, index: leftwards ? total - 1 : 0 })) : []
}

/** Windows a selection can be moved to: normal windows on the same side of the incognito boundary. */
export const eligibleWindowIds = (windows: readonly WindowSummary[], source: WindowSummary): number[] =>
  windows
    .filter(window => window.type === 'normal' && window.incognito === source.incognito && window.id !== source.id)
    .map(window => window.id)

/** Next window in a stable cycle, so repeated moves visit every window before coming back. */
export const nextWindowId = (windowIds: readonly number[], sourceId: number): number | undefined => {
  const sorted = [...windowIds].filter(id => id !== sourceId).sort((a, b) => a - b)
  return sorted.find(id => id > sourceId) ?? sorted[0]
}
