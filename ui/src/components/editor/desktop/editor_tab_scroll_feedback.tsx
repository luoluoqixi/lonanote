import type { ComponentType, RefObject } from "react";
import type { ScrollView } from "react-native";

export const EditorTabScrollFeedback: ComponentType<{
  scrollRef: RefObject<ScrollView | null>;
}> = () => null;
