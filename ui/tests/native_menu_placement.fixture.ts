import { expect, mock, test } from "bun:test";
import type { MenuAdapterRequest } from "rn-ui-kit";

const calls: any[] = [];
mock.module("../src/api/common/platform", () => ({ os: () => "windows" }));
const core = await import("@tauri-apps/api/core");
mock.module("@tauri-apps/api/core", () => ({
  ...core,
  invoke: async (command: string, args: unknown) => {
    calls.push({ command, args });
    return null;
  },
}));
const { createDesktopMenuAdapter } = await import("../src/api/common/desktop_menu_adapter.web");
globalThis.window = { devicePixelRatio: 1.5 } as Window & typeof globalThis;
const request: MenuAdapterRequest = {
  kind: "dropdown",
  source: "pointer",
  items: [],
  x: 990,
  y: 58,
  anchor: { rect: { x: 962, y: 30, width: 28, height: 28 } },
  placement: { side: "bottom", align: "end", sideOffset: 0 },
  signal: new AbortController().signal,
  isCurrent: () => true,
  select: async () => {},
};
test("editor 右上角更多的 end/bottom placement 传到原生宿主", async () => {
  const session = await createDesktopMenuAdapter("wcpopup", "dark").open(request);
  await session.closed;
  expect(calls.at(-1)).toMatchObject({
    command: "show_wcpopup_context_menu",
    args: { x: 990, y: 58, placement: { side: "bottom", align: "end" } },
  });
});
test("ContextMenu 的指针坐标不套用 Dropdown 对齐", async () => {
  const session = await createDesktopMenuAdapter("wcpopup", "dark").open({
    ...request,
    kind: "context-menu",
  });
  await session.closed;
  expect(calls.at(-1).args.placement).toBeUndefined();
});
