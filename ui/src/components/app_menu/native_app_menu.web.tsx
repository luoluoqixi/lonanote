import { useEffect, useRef } from "react";

import { serializeTauriMenuOperation } from "@/api/common/tauri_menu_operations";

import type { AppMenuNode } from "./app_menu_model";
import { createMenuLifecycle } from "./menu_lifecycle";
import type { useAppMenu } from "./use_app_menu";

export function NativeAppMenu({ menu }: { menu: ReturnType<typeof useAppMenu> }) {
  const latest = useRef(menu);
  latest.current = menu;
  const lifecycle = useRef(createMenuLifecycle(serializeTauriMenuOperation));
  const definition = JSON.stringify(menu.groups);
  useEffect(() => {
    const manager = lifecycle.current;
    void manager
      .replace(async () => {
        const { Menu, Submenu, MenuItem, PredefinedMenuItem } =
          await import("@tauri-apps/api/menu");
        const resources: { close(): Promise<void> }[] = [];
        const remember = <T extends { close(): Promise<void> }>(resource: T): T => {
          resources.push(resource);
          return resource;
        };
        const predefined = {
          undo: "Undo",
          redo: "Redo",
          cut: "Cut",
          copy: "Copy",
          paste: "Paste",
          selectAll: "SelectAll",
        } as const;
        const convert = async (
          nodes: AppMenuNode[],
        ): Promise<
          (
            | Awaited<ReturnType<typeof Submenu.new>>
            | Awaited<ReturnType<typeof MenuItem.new>>
            | Awaited<ReturnType<typeof PredefinedMenuItem.new>>
          )[]
        > => {
          const items = [];
          for (const node of nodes) {
            if (node.type === "separator")
              items.push(remember(await PredefinedMenuItem.new({ item: "Separator" })));
            else if (node.type === "submenu")
              items.push(
                remember(await Submenu.new({ text: node.title, items: await convert(node.items) })),
              );
            else if (node.action in predefined)
              items.push(
                remember(
                  await PredefinedMenuItem.new({
                    item: predefined[node.action as keyof typeof predefined],
                    text: node.title,
                  }),
                ),
              );
            else
              items.push(
                remember(
                  await MenuItem.new({
                    text: node.title,
                    enabled: node.enabled,
                    accelerator:
                      node.action === "zoomIn"
                        ? "Cmd+Plus"
                        : node.action === "zoomOut"
                          ? "Cmd+Minus"
                          : node.shortcut,
                    action: () => {
                      void latest.current.execute(node.action);
                    },
                  }),
                ),
              );
          }
          return items;
        };
        try {
          const appMenu = remember(
            await Submenu.new({
              text: "LonaNote",
              items: [
                remember(
                  await MenuItem.new({
                    text: "关于 LonaNote",
                    action: () => {
                      void latest.current.execute("about");
                    },
                  }),
                ),
                remember(await PredefinedMenuItem.new({ item: "Separator" })),
                remember(
                  await MenuItem.new({
                    text: "设置…",
                    accelerator: "Cmd+,",
                    action: () => {
                      void latest.current.execute("settings");
                    },
                  }),
                ),
                remember(await PredefinedMenuItem.new({ item: "Separator" })),
                remember(await PredefinedMenuItem.new({ item: "Services" })),
                remember(await PredefinedMenuItem.new({ item: "Hide" })),
                remember(await PredefinedMenuItem.new({ item: "HideOthers" })),
                remember(await PredefinedMenuItem.new({ item: "ShowAll" })),
                remember(await PredefinedMenuItem.new({ item: "Separator" })),
                remember(
                  await MenuItem.new({
                    text: "退出 LonaNote",
                    accelerator: "Cmd+Q",
                    action: () => {
                      void latest.current.execute("quit");
                    },
                  }),
                ),
              ],
            }),
          );
          const groups = JSON.parse(definition) as typeof menu.groups;
          const submenus = [];
          for (const group of groups)
            submenus.push(
              remember(await Submenu.new({ text: group.title, items: await convert(group.items) })),
            );
          const window = remember(
            await Submenu.new({
              text: "窗口",
              items: [
                remember(await PredefinedMenuItem.new({ item: "Minimize" })),
                remember(await PredefinedMenuItem.new({ item: "Fullscreen" })),
                remember(await PredefinedMenuItem.new({ item: "BringAllToFront" })),
              ],
            }),
          );
          const native = remember(await Menu.new({ items: [appMenu, ...submenus, window] }));
          return {
            install: async () => {
              const previous = await native.setAsAppMenu();
              await previous?.close();
            },
            close: async () => {
              for (const resource of resources.reverse()) await resource.close();
            },
          };
        } catch (error) {
          for (const resource of resources.reverse()) await resource.close().catch(() => undefined);
          throw error;
        }
      })
      .catch((error) => console.error("创建原生菜单失败", error));
  }, [definition]);
  useEffect(() => {
    const manager = lifecycle.current;
    return () => {
      void manager.dispose().catch((error) => console.error("关闭原生菜单失败", error));
    };
  }, []);
  return null;
}
