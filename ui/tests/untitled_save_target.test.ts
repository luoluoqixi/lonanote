import { expect, test } from "bun:test";

import {
  chooseUntitledSaveTargetWith,
  selectedSaveDirectory,
} from "../src/components/editor/controllers/untitled_save_target";
import type { ExplorerWorkspace } from "../src/stores/workspace/workspace_explorer_store";

test("保存目录仅使用选中文件夹，忽略文件选择，失效或空选择回根目录", () => {
  const explorer: ExplorerWorkspace = {
    epoch: 1,
    expandedPaths: [],
    selectedPaths: [],
    focusedPath: null,
    rangeAnchorPath: null,
    selectionMode: false,
    directories: {
      "": {
        loading: false,
        error: null,
        stale: false,
        requestId: 1,
        snapshot: {
          path: "",
          entries: [
            {
              path: "notes",
              fileType: "directory",
              lastModifiedTime: null,
              createTime: null,
              size: null,
            },
            {
              path: "notes/a.md",
              fileType: "file",
              lastModifiedTime: null,
              createTime: null,
              size: null,
            },
            {
              path: "README.md",
              fileType: "file",
              lastModifiedTime: null,
              createTime: null,
              size: null,
            },
          ],
        },
      },
    },
  };
  for (const [paths, focused, expected] of [
    [["notes"], "notes", "notes"],
    [["notes/a.md"], "notes/a.md", ""],
    [["README.md", "notes"], "notes", "notes"],
    [["notes/a.md", "notes"], "notes/a.md", "notes"],
    [["notes"], null, "notes"],
    [["README.md"], "notes", ""],
    [["removed"], "removed", ""],
    [[], "notes", ""],
  ] as const) {
    expect(
      selectedSaveDirectory({ ...explorer, selectedPaths: [...paths], focusedPath: focused }),
    ).toBe(expected);
  }
  expect(selectedSaveDirectory()).toBe("");
});

test("系统保存框使用工作区选中目录，Native 目录选择使用相同初始路径", async () => {
  for (const tauri of [true, false]) {
    for (const root of ["C:\\notes\\", "/notes/"]) {
      for (const selectedDirectory of ["", "folder/child"]) {
        await chooseUntitledSaveTargetWith(
          { title: "无标题" },
          {
            tauri,
            workspaceId: "w",
            selectedDirectory,
            root: async () => root,
            dialog: async ({ defaultDirectory }) => {
              const expected = selectedDirectory
                ? root.startsWith("C:")
                  ? "C:\\notes\\folder\\child"
                  : "/notes/folder/child"
                : root;
              expect(defaultDirectory).toBe(expected);
              return null;
            },
            directory: async (id, name, initialPath) => {
              expect([id, name, initialPath]).toEqual(["w", "无标题.md", selectedDirectory]);
              return null;
            },
            prepare: async () => {
              throw new Error("不应写入");
            },
            nativeTarget: async () => {
              throw new Error("不应写入");
            },
          },
        );
      }
    }
  }
});

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
