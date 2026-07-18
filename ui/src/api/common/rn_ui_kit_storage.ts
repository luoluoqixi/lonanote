import type { UiStorageAdapter } from "rn-ui-kit";

import { store } from "./store";

export const rnUiKitStorageAdapter: UiStorageAdapter = {
  getItem: (key) => store.commonGetSync(key),
  save: () => store.commonSaveSync(),
  setItem: (key, value) => store.commonSetSync(key, value),
};
