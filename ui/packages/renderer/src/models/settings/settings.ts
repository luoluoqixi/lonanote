import { create } from 'zustand';

import { Settings } from '@/bindings/api';

export interface SettingsStore {
  settings?: Settings;
}

export const useSettingsStore = create<SettingsStore>(() => ({}));
