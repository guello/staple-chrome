export type TabSwitchScope = 'window' | 'global'

export interface Settings {
  'tabSwitch.enabled': boolean
  'tabSwitch.scope': TabSwitchScope
  'tabShift.enabled': boolean
  'tabShift.wrap': boolean
  'tabShift.createWindow': boolean
}

export type BooleanSettingKey = 'tabSwitch.enabled' | 'tabShift.enabled' | 'tabShift.wrap' | 'tabShift.createWindow'

export const TAB_SWITCH_SCOPES: TabSwitchScope[] = ['window', 'global']

const DEFAULT_SETTINGS: Settings = {
  'tabSwitch.enabled': true,
  'tabSwitch.scope': 'window',
  'tabShift.enabled': true,
  'tabShift.wrap': false,
  'tabShift.createWindow': true,
}

const boolean = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const scope = (value: unknown, fallback: TabSwitchScope): TabSwitchScope =>
  TAB_SWITCH_SCOPES.includes(value as TabSwitchScope) ? (value as TabSwitchScope) : fallback

export const getSettings = async (): Promise<Settings> => {
  const stored: Record<string, unknown> = await chrome.storage.sync.get(DEFAULT_SETTINGS)
  return {
    'tabSwitch.enabled': boolean(stored['tabSwitch.enabled'], DEFAULT_SETTINGS['tabSwitch.enabled']),
    'tabSwitch.scope': scope(stored['tabSwitch.scope'], DEFAULT_SETTINGS['tabSwitch.scope']),
    'tabShift.enabled': boolean(stored['tabShift.enabled'], DEFAULT_SETTINGS['tabShift.enabled']),
    'tabShift.wrap': boolean(stored['tabShift.wrap'], DEFAULT_SETTINGS['tabShift.wrap']),
    'tabShift.createWindow': boolean(stored['tabShift.createWindow'], DEFAULT_SETTINGS['tabShift.createWindow']),
  }
}

export const setSetting = async <K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> => {
  await chrome.storage.sync.set({ [key]: value })
}
