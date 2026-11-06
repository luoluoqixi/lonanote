import { expect, test } from "bun:test";

import { chooseUntitledSaveTargetWith } from "../src/components/editor/controllers/untitled_save_target";

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
