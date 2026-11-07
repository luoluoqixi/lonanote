import { expect, test } from "bun:test";

import {
  DocumentHistory,
  applyTextChange,
  mapTextPosition,
  textChange,
} from "../src/components/editor/controllers/document_history";

test("跨视图共享撤销并拒绝旧令牌和修订", () => {
  const h = new DocumentHistory("a", 1);
  h.grant("left", "one");
  expect(h.submit("left", "one", 1, 1, textChange("a", "ab"))).toBe(true);
  h.grant("right", "two");
  expect(h.submit("left", "one", 2, 2, textChange("ab", "bad"))).toBe(false);
  expect(h.submit("right", "two", 1, 1, textChange("ab", "bad"))).toBe(false);
  expect(h.submit("right", "two", 2, 1, textChange("ab", "abc"))).toBe(true);
  expect(h.undo()).toBe("ab");
  expect(h.undo()).toBe("a");
  expect(h.redo()).toBe("ab");
  expect(h.redo()).toBe("abc");
  expect(DocumentHistory.restore(JSON.parse(JSON.stringify(h.snapshot()))).undo()).toBe("ab");
});
test("增量保留文本并映射选区", () => {
  const c = textChange("hello world", "hello new world");
  expect(c).toEqual({ from: 6, to: 6, insert: "new " });
  expect(applyTextChange("hello world", c)).toBe("hello new world");
  expect(mapTextPosition(11, c)).toBe(15);
});
test("连续普通输入合并撤销边界而lease交接打断合并", () => {
  const h = new DocumentHistory("", 0);
  h.grant("a", "x");
  h.submit("a", "x", 0, 1, textChange("", "a"));
  h.submit("a", "x", 1, 2, textChange("a", "ab"));
  expect(h.undo()).toBe("");
});
test("同一来源重发事务幂等且不增加修订", () => {
  const h = new DocumentHistory("", 0);
  h.grant("a", "t");
  const c = textChange("", "x");
  expect(h.submit("a", "t", 0, 1, c)).toBe(true);
  expect(h.submit("a", "t", 0, 1, c)).toBe(true);
  expect(h.revision).toBe(1);
  expect(h.undo()).toBe("");
});
test("历史最多保留1000条最近事务而不损坏最近撤销", () => {
  const h = new DocumentHistory("", 0);
  h.grant("a", "t");
  for (let i = 0; i < 1005; i++) {
    const before = h.text;
    h.submit("a", "t", h.revision, i + 1, textChange(before, before + "x"), true);
  }
  expect(h.snapshot().undo.length).toBe(1000);
  for (let i = 0; i < 1000; i++) h.undo();
  expect(h.text).toBe("xxxxx");
  expect(h.undo()).toBe("xxxxx");
});
test("历史文本预算约8MiB但保留最近单条超大事务", () => {
  const h = new DocumentHistory("", 0);
  h.grant("a", "t");
  let sequence = 0;
  for (let i = 0; i < 10; i++) {
    const next = h.text + "x".repeat(600000);
    h.submit("a", "t", h.revision, ++sequence, textChange(h.text, next), true);
  }
  expect(h.snapshot().undo.length).toBeLessThan(10);
  const before = h.text;
  const huge = before + "y".repeat(5 * 1024 * 1024);
  h.submit("a", "t", h.revision, ++sequence, textChange(before, huge), true);
  expect(h.snapshot().undo.length).toBe(1);
  expect(h.undo()).toBe(before);
});
