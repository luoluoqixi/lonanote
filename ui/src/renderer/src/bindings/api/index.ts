import { helloTest, initTest } from './test';

export const api = {
  helloTest,
};

export const initApi = async () => {
  await initTest();
};
