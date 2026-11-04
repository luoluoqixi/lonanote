/** 桌面入口只打开已有工作台上的弹窗，避免路由 push 生成第二个工作台。 */
export function openAppSettings(
  layoutMode: "desktop" | "mobile",
  page: "global" | "about",
  actions: { openDialog(page: "global" | "about"): void; navigate(route: string): void },
) {
  if (layoutMode === "desktop") actions.openDialog(page);
  else actions.navigate(page === "about" ? "/settings/about" : "/settings");
}
