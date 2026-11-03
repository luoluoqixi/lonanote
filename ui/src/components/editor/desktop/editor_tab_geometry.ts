import type { ScrollView, View } from "react-native";

import type { EditorTabDragGeometry } from "./editor_tab_reorder";

/** Native 使用 onLayout 的内容坐标；Web 使用同名平台实现测量实际 DOM。 */
export const readEditorTabGeometry: (
  scrollView: ScrollView | null,
  nodes: ReadonlyMap<string, View>,
) => EditorTabDragGeometry | null = () => null;
