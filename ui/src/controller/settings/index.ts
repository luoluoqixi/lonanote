import { initGlobalSettings } from './settings';
import { initUISettings } from './uiSettings';

export * from './settings';
export * from './uiSettings';
export * from './about';

export const initSettings = async () => {
  await initGlobalSettings();
  await initUISettings();
};
