import { initHelloTest } from "./hello_test";

export * from "./hello_test";

export const initTest = async () => {
  await initHelloTest();
};
