import type { Href } from "expo-router";
import type { ComponentType } from "react";

import { PathDebugPanel } from "./path_debug_panel";
import { UiComponentsDebugPanel } from "./ui_components_panel";
import { WorkspaceDebugPanel } from "./workspace_debug_panel";

type DebugTabKey = "workspace" | "path" | "components";
type DebugPanelPresentation = "scroll" | "static";
type DebugRouteMode = "sheet" | "page";

type DebugPanelRouteDefinition = {
  Component: ComponentType;
  description: string;
  href: Href;
  key: DebugTabKey;
  label: string;
  presentation: DebugPanelPresentation;
};

const DEBUG_HOME_HREF = "/debug" as Href;
const DEBUG_PAGE_HOME_HREF = "/debug_page" as Href;
const DEBUG_PANEL_TOGGLE_EVENT = "lonanote.debug-panel.toggle";
const DEBUG_ROUTE_PREFIX = "/debug";

const DEBUG_PANEL_ROUTE_DEFINITIONS: DebugPanelRouteDefinition[] = [
  {
    Component: WorkspaceDebugPanel,
    description: "查看 roots、registry records 与当前 runtime state。",
    href: "/debug/workspace" as Href,
    key: "workspace",
    label: "工作区",
    presentation: "scroll",
  },
  {
    Component: PathDebugPanel,
    description: "查看当前平台的默认路径与目录解析结果。",
    href: "/debug/path" as Href,
    key: "path",
    label: "路径",
    presentation: "scroll",
  },
  {
    Component: UiComponentsDebugPanel,
    description: "整页查看 UI wrapper 组件示例与交互表现。",
    href: "/debug/components" as Href,
    key: "components",
    label: "组件总览",
    presentation: "static",
  },
];

function getDebugPanelRouteDefinition(key: DebugTabKey): DebugPanelRouteDefinition {
  const matchedDefinition = DEBUG_PANEL_ROUTE_DEFINITIONS.find(
    (definition) => definition.key === key,
  );

  if (!matchedDefinition) {
    throw new Error(`Unknown debug panel route: ${key}`);
  }

  return matchedDefinition;
}

function isDebugRoutePath(pathname: string): boolean {
  return pathname === DEBUG_ROUTE_PREFIX || pathname.startsWith(`${DEBUG_ROUTE_PREFIX}/`);
}

function getDebugHomeHref(mode: DebugRouteMode = "sheet"): Href {
  return mode === "sheet" ? DEBUG_HOME_HREF : DEBUG_PAGE_HOME_HREF;
}

function getDebugPanelHref(key: DebugTabKey, mode: DebugRouteMode = "sheet"): Href {
  const baseHref = getDebugHomeHref(mode);
  return `${baseHref}/${key}` as Href;
}

const DEBUG_STACK_HEADER_TITLES: Record<string, string> = {
  index: "调试面板",
  ...Object.fromEntries(
    DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => [definition.key, definition.label]),
  ),
};

const DEBUG_MOBILE_HEADER_TITLES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(DEBUG_STACK_HEADER_TITLES).map(([routeName, title]) => [
      `debug/${routeName}`,
      title,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(DEBUG_STACK_HEADER_TITLES).map(([routeName, title]) => [
      `debug_page/${routeName}`,
      title,
    ]),
  ),
  ...DEBUG_STACK_HEADER_TITLES,
};

function getDebugStackHeaderTitle(routeName: string): string | null {
  return DEBUG_STACK_HEADER_TITLES[routeName] ?? null;
}

function getDebugMobileHeaderTitle(routeName: string): string | null {
  return DEBUG_MOBILE_HEADER_TITLES[routeName] ?? null;
}

export {
  DEBUG_HOME_HREF,
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  DEBUG_PANEL_TOGGLE_EVENT,
  DEBUG_PAGE_HOME_HREF,
  getDebugHomeHref,
  getDebugMobileHeaderTitle,
  getDebugPanelHref,
  getDebugPanelRouteDefinition,
  getDebugStackHeaderTitle,
  isDebugRoutePath,
};
export type { DebugPanelPresentation, DebugPanelRouteDefinition, DebugRouteMode, DebugTabKey };
