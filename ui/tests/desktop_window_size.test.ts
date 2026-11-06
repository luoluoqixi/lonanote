import { expect, test } from "bun:test";

import { createWindowSizeRecorder } from "../src/api/common/window_size_recorder";

test("初始化和相同逻辑尺寸不写盘，关闭只 flush 实际调整后的尺寸", async () => {
  const saved: unknown[] = [];
  const recorder = createWindowSizeRecorder({ width: 800, height: 600 }, async (size) => {
    saved.push(size);
  });
  await recorder.flush();
  recorder.record({ width: 800, height: 600 }, true);
  await recorder.flush();
  expect(saved).toEqual([]);
  recorder.record({ width: 900, height: 650 }, true);
  await recorder.flush();
  await recorder.flush();
  expect(saved).toEqual([{ width: 900, height: 650 }]);
});

test("最大化、全屏和记忆关闭不覆盖普通尺寸", async () => {
  const saved: unknown[] = [];
  const recorder = createWindowSizeRecorder({ width: 800, height: 600 }, async (size) => {
    saved.push(size);
  });
  recorder.record({ width: 1920, height: 1080 }, false);
  recorder.record({ width: 800, height: 600 }, true);
  await recorder.flush();
  expect(saved).toEqual([]);
  recorder.record({ width: 900, height: 650 }, true);
  recorder.disable();
  await recorder.flush();
  expect(saved).toEqual([]);
});

test("写盘期间再次调整会在同一次 flush 完成最新尺寸，保存失败保留待提交值", async () => {
  let release!: () => void;
  const saved: unknown[] = [];
  const recorder = createWindowSizeRecorder({ width: 800, height: 600 }, async (size) => {
    saved.push(size);
    if (saved.length === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
  });
  recorder.record({ width: 900, height: 650 }, true);
  const saving = recorder.flush();
  recorder.record({ width: 1000, height: 700 }, true);
  release();
  await saving;
  expect(saved).toEqual([
    { width: 900, height: 650 },
    { width: 1000, height: 700 },
  ]);
  let fail = true;
  const retry = createWindowSizeRecorder({ width: 800, height: 600 }, async () => {
    if (fail) throw new Error("写入失败");
  });
  retry.record({ width: 900, height: 650 }, true);
  await expect(retry.flush()).rejects.toThrow("写入失败");
  fail = false;
  await retry.flush();
});
