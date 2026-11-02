import { expect, test } from "bun:test";

import { createAsyncSubscription } from "../src/api/common/async_subscription";

test("注册晚于卸载完成时仍取消，重复清理只执行一次", async () => {
  let resolve!: (release: () => Promise<void>) => void;
  let releases = 0;
  const cleanup = createAsyncSubscription(
    () =>
      new Promise<() => Promise<void>>((r) => {
        resolve = r;
      }),
    () => {},
  );
  cleanup();
  cleanup();
  resolve(async () => {
    releases++;
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(releases).toBe(1);
});

test("异步取消监听失败会被处理，不产生未捕获的 rejection", async () => {
  const errors: unknown[] = [];
  const error = new Error("handlerId");
  const cleanup = createAsyncSubscription(
    async () => async () => {
      throw error;
    },
    (e) => errors.push(e),
  );
  await new Promise((r) => setTimeout(r, 0));
  cleanup();
  cleanup();
  await new Promise((r) => setTimeout(r, 0));
  expect(errors).toEqual([error]);
});
