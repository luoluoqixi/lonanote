import { expect, test } from "bun:test";

import type { FontSelection, ResolvedFont } from "../src/api/commands/fonts/types";
import { createFontRuntime } from "../src/fonts/font_runtime";

const selection = (name: string): FontSelection => ({
  platform: "windows",
  familyKey: name,
  displayName: name,
});
const result = (family: string): ResolvedFont => ({ family, faces: [] });

test("迟到的 A 不会覆盖 B，加载成功后才持久化", async () => {
  const pending = new Map<string, (font: ResolvedFont) => void>();
  const saved: FontSelection[] = [];
  const runtime = createFontRuntime({
    resolve: (font) => new Promise((resolve) => pending.set(font.familyKey, resolve)),
    load: async () => {},
  });
  const a = runtime.select(selection("A"), async (font) => {
    saved.push(font);
  });
  const b = runtime.select(selection("B"), async (font) => {
    saved.push(font);
  });
  pending.get("B")!(result("B"));
  await b;
  pending.get("A")!(result("A"));
  await a;
  expect(runtime.getSnapshot().font?.family).toBe("B");
  expect(saved).toEqual([selection("B")]);
});

test("远端偏好使旧加载失效，缺失字体回退但不改写偏好", async () => {
  let finish!: (font: ResolvedFont) => void;
  let commits = 0;
  const runtime = createFontRuntime({
    resolve: (font) =>
      font.familyKey === "missing"
        ? Promise.reject(new Error("不存在"))
        : new Promise((resolve) => {
            finish = resolve;
          }),
    load: async () => {},
  });
  const a = runtime.select(selection("A"), async () => {
    commits++;
  });
  await runtime.observe(null);
  finish(result("A"));
  await a;
  expect(commits).toBe(0);
  await runtime.observe(selection("missing"));
  expect(runtime.getSnapshot().font).toBeNull();
  expect(runtime.getSnapshot().unavailable).toBe(true);
  expect(runtime.getSnapshot().selection).toEqual(selection("missing"));
});

test("新选择加载失败保留旧字体，默认清理字体并保存 null", async () => {
  const runtime = createFontRuntime({
    resolve: async (font) => result(font.familyKey),
    load: async (font) => {
      if (font.family === "bad") throw new Error("加载失败");
    },
  });
  await runtime.observe(selection("old"));
  await expect(runtime.select(selection("bad"), async () => {})).rejects.toThrow("加载失败");
  expect(runtime.getSnapshot().font?.family).toBe("old");
  let saved: FontSelection | undefined;
  await runtime.select(null, async (font) => {
    saved = font;
  });
  expect(saved).toBeNull();
  expect(runtime.getSnapshot().font).toBeNull();
});

test("持久化失败恢复旧字体并允许重试，刷新可恢复缺失字体", async () => {
  let missing = true;
  const runtime = createFontRuntime({
    resolve: async (font) => {
      if (font.familyKey === "missing" && missing) throw new Error("不存在");
      return result(font.familyKey);
    },
    load: async () => {},
  });
  await runtime.observe(selection("old"));
  await expect(
    runtime.select(selection("new"), async () => {
      throw new Error("写盘失败");
    }),
  ).rejects.toThrow("写盘失败");
  expect(runtime.getSnapshot().font?.family).toBe("old");
  await runtime.observe(selection("missing"));
  expect(runtime.getSnapshot().unavailable).toBe(true);
  missing = false;
  await runtime.observe(selection("missing"), true);
  expect(runtime.getSnapshot().font?.family).toBe("missing");
  expect(runtime.getSnapshot().unavailable).toBe(false);
});
