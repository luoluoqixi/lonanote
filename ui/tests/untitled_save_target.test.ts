import { expect, test } from "bun:test";

import { chooseUntitledSaveTargetWith } from "../src/components/editor/controllers/untitled_save_target";

for (const [selected, expected, confirmed] of [
  ["C:/notes/existing.md", "C:/notes/existing.md", true],
  ["C:/notes/existing", "C:/notes/existing.md", false],
] as const) {
  test(`原生覆盖确认仅对实际选择的路径生效：${selected}`, async () => {
    let preparation: unknown;
    await chooseUntitledSaveTargetWith(
      { title: "无标题" },
      {
        tauri: true,
        workspaceId: null,
        root: async () => null,
        dialog: async () => ({ path: selected, overwriteConfirmed: true }),
        prepare: async (...args) => {
          preparation = args;
          return null;
        },
        directory: async () => null,
        nativeTarget: async () => {
          throw new Error("不应调用");
        },
      },
    );
    expect(preparation).toEqual([expected, { overwriteConfirmed: confirmed }]);
  });
}

test("Tauri 取消目标不准备写入，无工作区使用系统默认目录", async () => {
  let prepared = 0;
  const result = await chooseUntitledSaveTargetWith(
    { title: "无标题-1" },
    {
      tauri: true,
      workspaceId: null,
      root: async () => null,
      dialog: async (options) => {
        expect(options.defaultDirectory).toBeNull();
        return null;
      },
      prepare: async () => {
        prepared++;
        throw new Error("不应调用");
      },
      directory: async () => {
        throw new Error("不应调用");
      },
      nativeTarget: async () => {
        throw new Error("不应调用");
      },
    },
  );
  expect(result).toBeNull();
  expect(prepared).toBe(0);
});

test("Native 无工作区拒绝保存，不调用系统弹窗", async () => {
  await expect(
    chooseUntitledSaveTargetWith(
      { title: "无标题-1" },
      {
        tauri: false,
        workspaceId: null,
        root: async () => null,
        dialog: async () => {
          throw new Error("不应调用");
        },
        prepare: async () => {
          throw new Error("不应调用");
        },
        directory: async () => null,
        nativeTarget: async () => {
          throw new Error("不应调用");
        },
      },
    ),
  ).rejects.toThrow("请先打开工作区");
});
