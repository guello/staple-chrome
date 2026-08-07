import { type BooleanSettingKey } from '@/lib/settings'

export type FeatureId = 'tabSwitch' | 'tabShift'

export interface Feature {
  readonly name: string
  readonly description: string
  readonly enabledKey: BooleanSettingKey
}

export const FEATURES: Record<FeatureId, Feature> = {
  tabSwitch: {
    name: 'Tab Switch',
    description: 'Jump back and forth between the two tabs you last used.',
    enabledKey: 'tabSwitch.enabled',
  },
  tabShift: {
    name: 'Tab Shift',
    description: 'Move the highlighted tabs left, right, to the next window, or into a new one.',
    enabledKey: 'tabShift.enabled',
  },
}
