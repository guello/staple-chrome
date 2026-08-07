import { type CommandId, isCommandId } from '@/lib/commands'

export interface RunCommandMessage {
  type: 'run-command'
  command: CommandId
}

export interface MessageResult {
  ok: boolean
  error?: string
}

export const isRunCommandMessage = (value: unknown): value is RunCommandMessage => {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<RunCommandMessage>
  return message.type === 'run-command' && isCommandId(message.command)
}

export const runCommandInWorker = async (command: CommandId): Promise<MessageResult> => {
  const message: RunCommandMessage = { type: 'run-command', command }
  return (await chrome.runtime.sendMessage(message)) as MessageResult
}
