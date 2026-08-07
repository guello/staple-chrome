import { FEATURES, type FeatureId } from '@/lib/features'
import {
  type BooleanSettingKey,
  type Settings,
  TAB_SWITCH_SCOPES,
  type TabSwitchScope,
  getSettings,
  setSetting,
} from '@/lib/settings'
import { element } from '@/ui/dom'

const SHORTCUTS_URL = 'chrome://extensions/shortcuts'

interface ToggleSetting {
  readonly kind: 'toggle'
  readonly key: BooleanSettingKey
  readonly label: string
  readonly description: string
}

interface SelectSetting {
  readonly kind: 'select'
  readonly key: 'tabSwitch.scope'
  readonly label: string
  readonly description: string
  readonly labels: Record<TabSwitchScope, string>
}

type Setting = ToggleSetting | SelectSetting

const SETTINGS: Record<FeatureId, Setting[]> = {
  tabSwitch: [
    {
      kind: 'select',
      key: 'tabSwitch.scope',
      label: 'Switch between',
      description: 'Keep one history per window, or one history across every window.',
      labels: { window: 'Tabs in the current window', global: 'Tabs in every window' },
    },
  ],
  tabShift: [
    {
      kind: 'toggle',
      key: 'tabShift.wrap',
      label: 'Wrap around the edges',
      description: 'A tab at the far right moves back to the first position instead of staying put.',
    },
    {
      kind: 'toggle',
      key: 'tabShift.createWindow',
      label: 'Create a window when there is no other one',
      description: 'Moving to the next window opens a new one when the profile has a single window.',
    },
  ],
}

const controlId = (key: keyof Settings): string => key.replace('.', '-')

const buildText = (id: string, label: string, description: string, titleClass: string): HTMLElement => {
  const text = element('div', 'st-row-text')
  const title = element('label', titleClass, label)
  title.htmlFor = id
  text.append(title, element('span', 'st-row-meta', description))
  return text
}

const buildToggle = (
  key: BooleanSettingKey,
  checked: boolean,
  onChange?: (value: boolean) => void
): HTMLInputElement => {
  const toggle = element('input', 'st-toggle st-row-control')
  toggle.type = 'checkbox'
  toggle.id = controlId(key)
  toggle.checked = checked
  toggle.addEventListener('change', () => {
    void setSetting(key, toggle.checked)
    onChange?.(toggle.checked)
  })
  return toggle
}

const buildSelect = (setting: SelectSetting, value: TabSwitchScope): HTMLSelectElement => {
  const select = element('select', 'st-select st-row-control')
  select.id = controlId(setting.key)

  for (const scope of TAB_SWITCH_SCOPES) {
    const option = element('option', undefined, setting.labels[scope])
    option.value = scope
    select.append(option)
  }

  select.value = value
  select.addEventListener('change', () => {
    const scope = TAB_SWITCH_SCOPES.find(candidate => candidate === select.value)
    if (scope) void setSetting(setting.key, scope)
  })

  return select
}

const buildSetting = (setting: Setting, settings: Settings): HTMLElement => {
  const row = element('div', 'st-setting')
  row.append(buildText(controlId(setting.key), setting.label, setting.description, 'st-row-title'))
  row.append(
    setting.kind === 'toggle'
      ? buildToggle(setting.key, settings[setting.key])
      : buildSelect(setting, settings[setting.key])
  )
  return row
}

const buildCard = (id: FeatureId, settings: Settings): HTMLElement => {
  const feature = FEATURES[id]
  const card = element('section', 'st-card')

  const body = element('div')
  for (const setting of SETTINGS[id]) body.append(buildSetting(setting, settings))

  const setEnabled = (enabled: boolean): void => {
    body.classList.toggle('st-disabled', !enabled)
  }

  const header = element('div', 'st-card-header')
  header.append(
    buildText(controlId(feature.enabledKey), feature.name, feature.description, 'st-card-title'),
    buildToggle(feature.enabledKey, settings[feature.enabledKey], setEnabled)
  )

  setEnabled(settings[feature.enabledKey])
  card.append(header, body)
  return card
}

const render = async (): Promise<void> => {
  const container = document.querySelector('#features')
  if (!container) return

  const settings = await getSettings()
  for (const id of Object.keys(FEATURES) as FeatureId[]) container.append(buildCard(id, settings))
}

document.querySelector('#shortcuts')?.addEventListener('click', () => {
  void chrome.tabs.create({ url: SHORTCUTS_URL })
})

await render()
