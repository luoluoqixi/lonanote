import { initHelloTest } from './helloTest';

export * from './helloTest';

export const initTest = async () => {
  await initHelloTest();
};
