import { expect, test } from "bun:test";

import { mapNativeMessageButtons } from "../src/api/common/dialogs/native_dialog_model";

test("单按钮映射为系统确认按钮并保留业务 key", () => {
  const plan = mapNativeMessageButtons([{ key: "delete", text: "删除", style: "destructive" }]);
  expect(plan?.buttons).toEqual({ kind: "ok", ok: "删除" });
  expect(plan?.resolve("custom:删除")).toBe("delete");
});

test("取消加确认映射为原生 OkCancel 并按标签恢复 key", () => {
  const plan = mapNativeMessageButtons([
    { key: "cancel", text: "取消", style: "cancel" },
    { key: "discard", text: "不保存", style: "destructive" },
  ]);
  expect(plan?.buttons).toEqual({ kind: "okCancel", ok: "不保存", cancel: "取消" });
  expect(plan?.resolve("custom:取消")).toBe("cancel");
  expect(plan?.resolve("custom:不保存")).toBe("discard");
});

test("四按钮或无法区分的按钮组交给自定义弹窗", () => {
  expect(mapNativeMessageButtons(Array.from({ length: 4 }, (_, index) => ({
    key: String(index), text: `选项${index}`,
  })))).toBeUndefined();
  expect(mapNativeMessageButtons([
    { key: "a", text: "继续" },
    { key: "b", text: "返回" },
  ])).toBeUndefined();
});
