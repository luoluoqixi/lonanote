import type { Href } from "expo-router";
import type { ComponentType } from "react";

import { PathDebugPanel } from "./path_debug_panel";
import { UiComponentsDebugPanel } from "./ui_components_panel";
import { WorkspaceDebugPanel } from "./workspace_debug_panel";

export type DebugTabKey = "workspace" | "path" | "components";
export type DebugPanelPresentation = "scroll" | "static";

export type DebugPanelRouteDefinition = {
  Component: ComponentType;
  description: string;
  key: DebugTabKey;
  label: string;
  presentation: DebugPanelPresentation;
};

export const DEBUG_PANEL_TOGGLE_EVENT = "lonanote.debug-panel.toggle";

export const DEBUG_PANEL_ROUTE_DEFINITIONS: DebugPanelRouteDefinition[] = [
  {
    Component: WorkspaceDebugPanel,
    description: "查看 roots、registry records 与当前 runtime state。",
    key: "workspace",
    label: "工作区",
    presentation: "scroll",
  },
  {
    Component: PathDebugPanel,
    description: "查看当前平台的默认路径与目录解析结果。",
    key: "path",
    label: "路径",
    presentation: "scroll",
  },
  {
    Component: UiComponentsDebugPanel,
    description: "整页查看 UI wrapper 组件示例与交互表现。",
    key: "components",
    label: "组件总览",
    presentation: "static",
  },
];

const DEBUG_TAB_KEYS = new Set<DebugTabKey>(
  DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => definition.key),
);

export function isDebugTabKey(value: string | undefined): value is DebugTabKey {
  return value != null && DEBUG_TAB_KEYS.has(value as DebugTabKey);
}

/** 全屏 Stack 调试面板首页 */
export const DEBUG_HOME_HREF = "/debug" as Href;

/** 全屏 Stack 调试分区路由：`/debug/workspace` 等 */
export function getDebugFullPageHref(key: DebugTabKey): Href {
  return `/debug/${key}` as Href;
}

export function getDebugPanelRouteDefinition(key: DebugTabKey): DebugPanelRouteDefinition {
  const matchedDefinition = DEBUG_PANEL_ROUTE_DEFINITIONS.find(
    (definition) => definition.key === key,
  );

  if (!matchedDefinition) {
    throw new Error(`Unknown debug panel route: ${key}`);
  }

  return matchedDefinition;
}
