import { COMMAND_IDS, type CommandId } from '@/lib/commands'
import { FEATURES, type Feature, type FeatureId } from '@/lib/features'
import { runCommandInWorker } from '@/lib/messages'
import { getSettings } from '@/lib/settings'
import { element, icon } from '@/ui/dom'

const SHORTCUTS_URL = 'chrome://extensions/shortcuts'

interface CommandPresentation {
  readonly feature: FeatureId
  readonly label: string
  readonly icon: string
}

/** Short labels and Material Symbols outlines, inlined so the popup paints without a network or font request. */
const PRESENTATION: Record<CommandId, CommandPresentation> = {
  'tab-switch': {
    feature: 'tabSwitch',
    label: 'Switch to the last tab',
    icon: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  },
  'tab-shift-left': {
    feature: 'tabShift',
    label: 'Move tabs left',
    icon: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  },
  'tab-shift-right': {
    feature: 'tabShift',
    label: 'Move tabs right',
    icon: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z',
  },
  'tab-shift-to-next-window': {
    feature: 'tabShift',
    label: 'Move tabs to the next window',
    icon: 'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V8h14v10z',
  },
  'tab-shift-undock': {
    feature: 'tabShift',
    label: 'Move tabs to a new window',
    icon: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  },
}

const run = async (command: CommandId): Promise<void> => {
  const result = await runCommandInWorker(command)
  if (!result.ok) {
    console.error(`Staple: ${command} failed`, result.error)
    return
  }
  window.close()
}

const buildRow = (command: CommandId, shortcut: string): HTMLButtonElement => {
  const { label, icon: path } = PRESENTATION[command]

  const row = element('button', 'st-row')
  row.type = 'button'

  const glyph = element('span', 'st-row-icon')
  glyph.append(icon(path))

  const text = element('span', 'st-row-text')
  text.append(
    element('span', 'st-row-title', label),
    element('span', 'st-row-meta', shortcut === '' ? 'No shortcut assigned' : shortcut)
  )

  row.append(glyph, text)
  row.addEventListener('click', () => void run(command))
  return row
}

const buildSection = (id: FeatureId, feature: Feature, shortcuts: Map<string, string>): HTMLElement[] => {
  const rows = COMMAND_IDS.filter(command => PRESENTATION[command].feature === id).map(command =>
    buildRow(command, shortcuts.get(command) ?? '')
  )
  return [element('h2', 'st-section-header', feature.name), ...rows]
}

const render = async (): Promise<void> => {
  const list = document.querySelector('#tools')
  if (!list) return

  const [settings, commands] = await Promise.all([getSettings(), chrome.commands.getAll()])
  const shortcuts = new Map(commands.map(command => [command.name ?? '', command.shortcut ?? '']))

  for (const [id, feature] of Object.entries(FEATURES) as [FeatureId, Feature][]) {
    if (settings[feature.enabledKey]) list.append(...buildSection(id, feature, shortcuts))
  }

  if (list.childElementCount === 0) {
    list.append(element('p', 'st-empty', 'Every tool is turned off. Open Settings to bring one back.'))
  }
}

document.querySelector('#settings')?.addEventListener('click', () => {
  void chrome.runtime.openOptionsPage()
})

document.querySelector('#shortcuts')?.addEventListener('click', () => {
  void chrome.tabs.create({ url: SHORTCUTS_URL })
})

await render()
