import { registerTabShift } from '@/features/tab-shift'
import { registerTabSwitch } from '@/features/tab-switch'
import { isCommandId, runCommand } from '@/lib/commands'
import { type MessageResult, isRunCommandMessage } from '@/lib/messages'

registerTabSwitch()
registerTabShift()

chrome.commands.onCommand.addListener(command => {
  if (isCommandId(command)) void runCommand(command)
})

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (result: MessageResult) => void) => {
  if (!isRunCommandMessage(message)) return false

  void (async () => {
    try {
      await runCommand(message.command)
      sendResponse({ ok: true })
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })()

  return true
})
