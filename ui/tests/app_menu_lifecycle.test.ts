import { expect, test } from "bun:test";

import { createMenuLifecycle } from "../src/components/app_menu/menu_lifecycle";

test("异步创建期间卸载不安装菜单且释放资源", async () => {
  const calls: string[] = [];
  let finish!: () => void;
  const lifecycle = createMenuLifecycle();
  const pending = lifecycle.replace(async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return {
      install: async () => {
        calls.push("install");
      },
      close: async () => {
        calls.push("close");
      },
    };
  });
  await Promise.resolve();
  const disposed = lifecycle.dispose();
  finish();
  await Promise.all([pending, disposed]);
  expect(calls).toEqual(["close"]);
});

test("替换完成后释放旧菜单，安装不会并发", async () => {
  const calls: string[] = [];
  const lifecycle = createMenuLifecycle();
  const make = (id: string) => async () => ({
    install: async () => {
      calls.push(`install:${id}`);
    },
    close: async () => {
      calls.push(`close:${id}`);
    },
  });
  await lifecycle.replace(make("a"));
  await lifecycle.replace(make("b"));
  await lifecycle.dispose();
  expect(calls).toEqual(["install:a", "install:b", "close:a", "close:b"]);
});
