import { expect, test } from "bun:test";

import { serializeTauriMenuOperation } from "../src/api/common/tauri_menu_operations";
import { createMenuLifecycle } from "../src/components/app_menu/menu_lifecycle";

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

test("上下文菜单期间多次更新时，只安装最新的应用菜单定义", async () => {
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

  const lifecycle = createMenuLifecycle(serializeTauriMenuOperation);
  const createMenu = (id: string) => async () => ({
    install: async () => {
      events.push(`install:${id}`);
    },
    close: async () => {
      events.push(`close:${id}`);
    },
  });
  const previous = lifecycle.replace(createMenu("previous"));
  const latest = lifecycle.replace(createMenu("latest"));
  closeContextMenu();

  await Promise.all([contextMenu, previous, latest]);
  expect(events).toEqual(["context:open", "context:close", "install:latest"]);
  await lifecycle.dispose();
});
