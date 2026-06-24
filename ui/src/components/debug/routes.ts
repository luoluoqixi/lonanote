import type { Href } from "expo-router";
import type { ComponentType, ReactNode } from "react";

import { PathDebugPage } from "./pages/sections/path_debug_page";
import { UiComponentsDebugPage } from "./pages/sections/ui_components_debug_page";
import { WorkspaceDebugPage } from "./pages/sections/workspace_debug_page";

export type DebugTabKey = "workspace" | "path" | "components";
export type DebugPanelPresentation = "scroll" | "static";

export type DebugSectionContentProps = {
  header?: ReactNode;
};

export type DebugPanelRouteDefinition = {
  description?: string;
  key: DebugTabKey;
  label: string;
  Page: ComponentType<DebugSectionContentProps>;
  presentation: DebugPanelPresentation;
};

export const DEBUG_PANEL_TOGGLE_EVENT = "lonanote.debug-panel.toggle";

export const DEBUG_PANEL_ROUTE_DEFINITIONS: DebugPanelRouteDefinition[] = [
  {
    Page: WorkspaceDebugPage,
    description: "查看 roots、registry、runtime state。",
    key: "workspace",
    label: "工作区",
    presentation: "scroll",
  },
  {
    Page: PathDebugPage,
    description: "查看当前平台的路径解析结果。",
    key: "path",
    label: "路径",
    presentation: "scroll",
  },
  {
    Page: UiComponentsDebugPage,
    description: "整页查看组件示例与交互。",
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
