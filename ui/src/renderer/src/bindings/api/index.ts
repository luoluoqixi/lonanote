import { helloTest, initTest } from './test';
import { workspace } from './workspace';

export const api = {
  helloTest,
  workspace,
};

export const initApi = async () => {
  await initTest();
};
