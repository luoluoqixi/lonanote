import { expect, test } from "bun:test";

import { getEditorGroupGeometry } from "../src/components/editor/desktop/editor_group_geometry";
import { getEditorTabCloseTargets } from "../src/components/editor/desktop/editor_tab_menu_actions";

test("关闭其他和全部只作用于右键标签所在组", () => {
  const state = {
    openEditorIds: ["a", "b", "c"],
    editorsById: {},
    documentsById: {},
    viewersById: {},
    groupsById: {
      left: { groupId: "left", tabIds: ["a", "b"], activeTabId: "a" },
      right: { groupId: "right", tabIds: ["c"], activeTabId: "c" },
    },
  };
  expect(getEditorTabCloseTargets("closeAll", "a", state)).toEqual(["a", "b"]);
  expect(getEditorTabCloseTargets("closeOthers", "a", state)).toEqual(["b"]);
  expect(getEditorTabCloseTargets("closeRight", "b", state)).toEqual([]);
});
test("嵌套布局生成同级稳定容器的矩形与分隔线", () => {
  const result = getEditorGroupGeometry({
    kind: "split",
    splitId: "s1",
    direction: "row",
    ratio: 0.4,
    first: { kind: "group", groupId: "a" },
    second: {
      kind: "split",
      splitId: "s2",
      direction: "column",
      ratio: 0.5,
      first: { kind: "group", groupId: "b" },
      second: { kind: "group", groupId: "c" },
    },
  });
  expect(result.groups.a).toEqual({ left: 0, top: 0, width: 0.4, height: 1 });
  expect(result.groups.c).toEqual({ left: 0.4, top: 0.5, width: 0.6, height: 0.5 });
  expect(result.dividers).toHaveLength(2);
});
