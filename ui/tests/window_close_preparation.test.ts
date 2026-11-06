import { expect, test } from "bun:test";

import { createClosePreparation } from "../src/api/common/window_close_preparation";

test("准备成功后仍保留内容，所有窗口确认后才提交关闭", async () => {
  const documents = ["草稿"];
  const transaction = createClosePreparation(async (waitForCommit) => {
    if (!(await waitForCommit())) return false;
    documents.splice(0);
    return true;
  });
  expect(await transaction.ready).toBe(true);
  expect(documents).toEqual(["草稿"]);
  expect(await transaction.finish(true)).toBe(true);
  expect(documents).toEqual([]);
});

test("其他窗口取消时撤销准备，不关闭已经确认放弃的文档", async () => {
  const documents = ["草稿"];
  const transaction = createClosePreparation(async (waitForCommit) => {
    if (!(await waitForCommit())) return false;
    documents.splice(0);
    return true;
  });
  expect(await transaction.ready).toBe(true);
  expect(await transaction.finish(false)).toBe(false);
  expect(documents).toEqual(["草稿"]);
});

test("取消或保存失败不进入提交阶段", async () => {
  const cancelled = createClosePreparation(async () => false);
  expect(await cancelled.ready).toBe(false);
  expect(await cancelled.finish(false)).toBe(false);
  const failed = createClosePreparation(async () => {
    throw new Error("保存失败");
  });
  expect(await failed.ready).toBe(false);
  expect((failed.getError() as Error).message).toBe("保存失败");
  expect(await failed.finish(false)).toBe(false);
});

test("准备尚在等待用户确认时可以收到撤销，迟到确认不会提交", async () => {
  let confirm!: () => void;
  const confirmation = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  const documents = ["草稿"];
  const transaction = createClosePreparation(async (waitForCommit) => {
    await confirmation;
    if (!(await waitForCommit())) return false;
    documents.splice(0);
    return true;
  });
  const aborted = transaction.finish(false);
  confirm();
  expect(await aborted).toBe(false);
  expect(documents).toEqual(["草稿"]);
});
