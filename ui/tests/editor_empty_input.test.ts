import { expect, test } from "bun:test";
import { Window } from "happy-dom";

import { isEmptyEditorTarget } from "../src/components/editor/desktop/editor_empty_target";

test("双击空白或说明可新建，操作按钮及其图标不能触发新建", () => {
  const window = new Window();
  const root = window.document.createElement("div");
  root.innerHTML =
    '<span>尚未打开文档</span><button><span>打开文件</span></button><div role="menuitem"><span>历史</span></div>';
  expect(isEmptyEditorTarget(root)).toBe(true);
  expect(isEmptyEditorTarget(root.firstElementChild!)).toBe(true);
  expect(isEmptyEditorTarget(root.querySelector("button span")!)).toBe(false);
  expect(isEmptyEditorTarget(root.querySelector('[role="menuitem"] span')!)).toBe(false);
});
