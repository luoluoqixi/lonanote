import { expect, test } from "bun:test";

import { resolveTauriMenuPosition } from "../src/api/common/tauri_menu_position";

test("Windows 菜单位置包含系统 DPI 和 WebView 页面缩放", () => {
  // 150% 系统 DPI、80% 页面缩放：CSS 像素与物理像素比为 1.2。
  const position = resolveTauriMenuPosition(500, 200, "windows", 1.2);
  expect(position.type).toBe("Physical");
  expect([position.x, position.y]).toEqual([600, 240]);
  const normal = resolveTauriMenuPosition(500, 200, "windows", 1);
  expect([normal.x, normal.y]).toEqual([500, 200]);
  const highDpi = resolveTauriMenuPosition(500, 200, "windows", 2);
  expect([highDpi.x, highDpi.y]).toEqual([1000, 400]);
});

test("小数物理像素取整，其余系统沿用原来的逻辑坐标", () => {
  const windows = resolveTauriMenuPosition(13.5, 23.2, "windows", 1.25);
  expect([windows.x, windows.y]).toEqual([17, 29]);
  for (const platform of ["macos", "linux"]) {
    const position = resolveTauriMenuPosition(13.5, 23.2, platform, 2);
    expect(position.type).toBe("Logical");
    expect([position.x, position.y]).toEqual([13.5, 23.2]);
  }
});
