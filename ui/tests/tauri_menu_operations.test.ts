import { expect, test } from "bun:test";

import { serializeTauriMenuOperation } from "../src/api/common/tauri_menu_operations";

test("上下文菜单打开期间，应用菜单操作排队到菜单关闭后", async () => {
  const events: string[] = [];
  let closeContextMenu!: () => void;

  const contextMenu = serializeTauriMenuOperation(async () => {
    events.push("context:open");
    await new Promise<void>((resolve) => {
      closeContextMenu = resolve;
    });
    events.push("context:close");
  });
  await Promise.resolve();

  const appMenu = serializeTauriMenuOperation(async () => {
    events.push("app-menu:replace");
  });
  await Promise.resolve();
  expect(events).toEqual(["context:open"]);

  closeContextMenu();
  await Promise.all([contextMenu, appMenu]);
  expect(events).toEqual(["context:open", "context:close", "app-menu:replace"]);
});
