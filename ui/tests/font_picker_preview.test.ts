import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("字体列表使用已加载的预览 family，设置列表继承库默认外观", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./font_picker_preview.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
