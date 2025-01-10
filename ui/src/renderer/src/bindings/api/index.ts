import { initTest } from './test';

export * from './dialog';
export * from './path';
export * from './settings';
export * from './test';
export * from './workspace';

export const initApi = async () => {
  await initTest();
};
