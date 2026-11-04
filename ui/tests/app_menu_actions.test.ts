import { expect, test } from "bun:test";

import { createSingleFlight, saveDocuments } from "../src/components/app_menu/app_menu_actions";

test("重复操作共用同一个进行中的 Promise，完成后允许再次执行", async () => {
  let calls = 0;
  let release!: () => void;
  const run = createSingleFlight();
  const work = async () => {
    calls++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  };
  const first = run(work);
  const second = run(work);
  expect(calls).toBe(1);
  release();
  await Promise.all([first, second]);
  expect(calls).toBe(1);
  await run(async () => {
    calls++;
  });
  expect(calls).toBe(2);
});

test("全部保存去重，一项失败后仍保存其余文档", async () => {
  const saved: string[] = [];
  const failures = await saveDocuments(["a", "a", "b"], async (id) => {
    saved.push(id);
    if (id === "a") throw new Error("写入失败");
  });
  expect(saved).toEqual(["a", "b"]);
  expect(failures).toEqual(["a：写入失败"]);
});
