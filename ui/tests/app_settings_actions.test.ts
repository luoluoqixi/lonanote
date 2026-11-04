import { expect, test } from "bun:test";

import { openAppSettings } from "../src/components/app_menu/app_settings_actions";

test("桌面布局设置及关于共用弹窗，不导航或重建工作台；移动布局沿用路由", () => {
  const dialogs: string[] = [];
  const routes: string[] = [];
  const deps = {
    openDialog: (page: string) => dialogs.push(page),
    navigate: (route: string) => routes.push(route),
  };
  openAppSettings("desktop", "global", deps);
  openAppSettings("desktop", "about", deps);
  expect(dialogs).toEqual(["global", "about"]);
  expect(routes).toEqual([]);
  openAppSettings("mobile", "global", deps);
  openAppSettings("mobile", "about", deps);
  expect(routes).toEqual(["/settings", "/settings/about"]);
});
