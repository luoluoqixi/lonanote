import { expect, test } from "bun:test";

import { reloadAppWindow } from "../src/components/app_menu/app_window_reload";

test("刷新 Web 窗口时仅调用浏览器 reload", () => {
  const calls: string[] = [];

  reloadAppWindow(
    false,
    () => calls.push("web"),
    () => calls.push("native"),
  );

  expect(calls).toEqual(["web"]);
});

test("刷新 Native 窗口时仅调用开发菜单 reload", () => {
  const calls: string[] = [];

  reloadAppWindow(
    true,
    () => calls.push("web"),
    () => calls.push("native"),
  );

  expect(calls).toEqual(["native"]);
});

test("刷新等待草稿准备完成，准备失败不执行reload", async () => {
  const { reloadAppWindowWithPreparation } =
    await import("../src/components/app_menu/app_window_reload");
  const events: string[] = [];
  let proceed!: () => void;
  const pending = new Promise<void>((resolve) => {
    proceed = resolve;
  });
  const task = reloadAppWindowWithPreparation(
    false,
    () => events.push("reload"),
    () => {},
    async (reload) => {
      events.push("freeze");
      await pending;
      events.push("checkpoint");
      reload();
    },
  );
  expect(events).toEqual(["freeze"]);
  proceed();
  await task;
  expect(events).toEqual(["freeze", "checkpoint", "reload"]);
  await expect(
    reloadAppWindowWithPreparation(
      false,
      () => events.push("bad reload"),
      () => {},
      async () => {
        throw new Error("composition");
      },
    ),
  ).rejects.toThrow("composition");
  expect(events).not.toContain("bad reload");
});
