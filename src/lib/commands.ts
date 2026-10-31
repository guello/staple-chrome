export const COMMAND_IDS = [
  'tab-switch',
  'tab-shift-left',
  'tab-shift-right',
  'tab-shift-to-next-window',
  'tab-shift-undock',
] as const

export type CommandId = (typeof COMMAND_IDS)[number]

const handlers = new Map<CommandId, () => Promise<void>>()

export const isCommandId = (value: unknown): value is CommandId =>
  typeof value === 'string' && (COMMAND_IDS as readonly string[]).includes(value)

export const registerCommand = (id: CommandId, handler: () => Promise<void>): void => {
  handlers.set(id, handler)
}

export const runCommand = async (id: CommandId): Promise<void> => {
  await handlers.get(id)?.()
}
