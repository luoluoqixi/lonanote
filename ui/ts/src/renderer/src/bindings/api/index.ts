import { initTest } from './test';

export * from './dialog';
export * from './fs';
export * from './path';
export * from './settings';
export * from './test';
export * from './workspace';
export * from './system';

export const initApi = async () => {
  await initTest();
};
