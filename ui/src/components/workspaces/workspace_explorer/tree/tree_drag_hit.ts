import type { View } from "react-native";

import type { TreeDragBounds } from "./tree_drag_model";

/** Native 由视口和行高命中，Web 进一步排除滚动条、菜单及按钮。 */
export const canStartTreeDrag: (x: number, y: number, path: string) => boolean = () => true;
export const readTreeDragBounds: (node: View | null) => TreeDragBounds | null = () => null;

export const isTreeEditorDrop: (x: number, y: number, activate?: boolean) => boolean = () => false;
