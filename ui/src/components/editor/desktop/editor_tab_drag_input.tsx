import { type ReactNode, useMemo, useRef } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { Gesture, GestureDetector, MouseButton } from "react-native-gesture-handler";

export type EditorTabDragInputProps = {
  editorId: string;
  children: ReactNode;
  enabled: boolean;
  dragging: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  viewRef: (node: View | null) => void;
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onFinish: (commit: boolean) => void;
};

/** 手势实例不随拖动预览重建，避免重绘时取消正在进行的拖动。 */
export function EditorTabDragInput(props: EditorTabDragInputProps) {
  const latest = useRef(props);
  latest.current = props;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(props.enabled)
        .mouseButton(MouseButton.LEFT)
        .activeOffsetX([-6, 6])
        .activeOffsetY([-6, 6])
        .runOnJS(true)
        .onStart((event) => latest.current.onStart(event.absoluteX, event.absoluteY))
        .onUpdate((event) => latest.current.onMove(event.absoluteX, event.absoluteY))
        .onEnd((event) => {
          latest.current.onMove(event.absoluteX, event.absoluteY);
          latest.current.onFinish(true);
        })
        .onFinalize(() => latest.current.onFinish(false)),
    [props.enabled],
  );
  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View
        ref={props.viewRef}
        onLayout={props.onLayout}
        style={{ flexShrink: 0, height: 36, opacity: props.dragging ? 0.35 : 1 }}
      >
        {props.children}
      </View>
    </GestureDetector>
  );
}
