import { expect, test } from "bun:test";

import { getEditorDroppedFiles } from "../src/components/editor/desktop/editor_file_drop";

const bounds = { left: 300, top: 80, right: 1000, bottom: 800 };

test("系统物理坐标按 DPI 和页面缩放换算，仅接收编辑器区域内的拖放", () => {
  const paths = ["C:\\笔记\\测试.md"];
  expect(getEditorDroppedFiles(paths, { x: 800, y: 300 }, bounds, 2)).toEqual(paths);
  expect(getEditorDroppedFiles(paths, { x: 400, y: 300 }, bounds, 2)).toEqual([]);
  expect(getEditorDroppedFiles(paths, { x: 800, y: 100 }, bounds, 2)).toEqual([]);
  expect(getEditorDroppedFiles(paths, { x: 2000, y: 300 }, bounds, 2)).toEqual([]);
});

test("批量拖入沿用打开文件的扩展名，忽略其他文件并保留顺序", () => {
  const paths = ["C:\\中文 空格.MD", "/notes/a.markdown", "/notes/b.mdx", "/notes/c.txt"];
  expect(
    getEditorDroppedFiles(
      [...paths, "/notes/image.png", "/notes/folder", "/notes/a.md.exe"],
      { x: 400, y: 150 },
      bounds,
      1,
    ),
  ).toEqual(paths);
});
