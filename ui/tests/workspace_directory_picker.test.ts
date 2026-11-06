import { expect, test } from "bun:test";

import {
  createDirectoryPickerModel,
  createIndexedDirectoryLoader,
} from "../src/components/workspaces/directory_picker/directory_picker_model";

test("根可选，禁止自身及后代；仅加载目录，失败可以重试", async () => {
  let fail = true;
  const model = createDirectoryPickerModel(async () => {
    if (fail) throw new Error("读取失败");
    return [
      { path: "folder", metadata: { kind: "directory" as const } },
      { path: "note.md", metadata: { kind: "file" as const } },
    ];
  });
  const pending = model.request({ workspaceId: "a", purpose: "move", excludedPaths: ["source"] });
  expect(model.canConfirm()).toBe(true);
  model.select("source/child");
  expect(model.canConfirm()).toBe(false);
  model.select("");
  await model.load("");
  expect(model.getSnapshot()?.errors[""]).toBe("读取失败");
  fail = false;
  await model.load("");
  expect(model.getSnapshot()?.directories[""]?.map((e) => e.path)).toEqual(["folder"]);
  model.confirm();
  expect(await pending).toEqual({ directory: "" });
});

test("替换请求取消旧 Promise，旧异步结果不能覆盖新请求", async () => {
  let resolve!: (value: []) => void;
  const model = createDirectoryPickerModel(
    () =>
      new Promise<[]>((done) => {
        resolve = done;
      }),
  );
  const a = model.request({ workspaceId: "a", purpose: "copy" });
  const load = model.load("");
  const b = model.request({ workspaceId: "b", purpose: "save", suggestedFileName: "无标题-1.md" });
  expect(await a).toBeNull();
  resolve([]);
  await load;
  expect(model.getSnapshot()?.directories[""]).toBeUndefined();
  model.setFileName("../bad.md");
  expect(model.canConfirm()).toBe(false);
  model.cancel();
  expect(await b).toBeNull();
  expect(model.getSnapshot()).toBeNull();
});

test("点击目录整行选中并展开，再次点击收起，折叠不改变目标", async () => {
  const model = createDirectoryPickerModel(async () => []);
  const result = model.request({ workspaceId: "w", purpose: "copy" });
  await model.activate("folder");
  expect(model.getSnapshot()?.selected).toBe("folder");
  expect(model.getSnapshot()?.expanded.has("folder")).toBe(true);
  expect(model.getSnapshot()?.directories.folder).toEqual([]);
  await model.activate("folder");
  expect(model.getSnapshot()?.expanded.has("folder")).toBe(false);
  expect(model.getSnapshot()?.selected).toBe("folder");
  model.cancel();
  await result;
});

test("目录选择加载经过 Index 过滤的目录快照，不读原始 Storage 列表", async () => {
  const calls: string[] = [];
  const load = createIndexedDirectoryLoader(async (id, path) => {
    calls.push(`${id}:${path}`);
    return {
      path,
      entries: [
        {
          path: "visible",
          fileType: "directory",
          size: null,
          createTime: null,
          lastModifiedTime: null,
        },
        { path: "note.md", fileType: "file", size: 3, createTime: null, lastModifiedTime: null },
      ],
    };
  });
  const model = createDirectoryPickerModel(load);
  const request = model.request({ workspaceId: "w", purpose: "copy" });
  await model.load("");
  expect(calls).toEqual(["w:"]);
  expect(model.getSnapshot()?.directories[""]?.map((e) => e.path)).toEqual(["visible"]);
  model.cancel();
  await request;
});
