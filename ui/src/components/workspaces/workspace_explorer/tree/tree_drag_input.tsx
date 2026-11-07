import { type ReactNode, useMemo, useRef } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { Gesture, GestureDetector, MouseButton, PointerType } from "react-native-gesture-handler";

export type TreeDragInputProps = {
  children: ReactNode;
  enabled: boolean;
  viewRef: (node: View | null) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onStart: (fromX: number, fromY: number, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onFinish: (commit: boolean) => void;
  nativeData?: (
    x: number,
    y: number,
  ) => { workspaceId: string; files: string[]; label: string } | null;
};

/** 与标签页相同的 Pan 接入；仅处理鼠标，触摸继续滚动文件树。 */
export function TreeDragInput(props: TreeDragInputProps) {
  const latest = useRef(props);
  const origin = useRef({ x: 0, y: 0 });
  latest.current = props;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(props.enabled)
        .mouseButton(MouseButton.LEFT)
        .activeCursor("default")
        .minDistance(6)
        .runOnJS(true)
        .onTouchesDown((event, manager) => {
          if (event.pointerType !== PointerType.MOUSE) manager.fail();
        })
        .onBegin((event) => {
          origin.current = { x: event.absoluteX, y: event.absoluteY };
        })
        .onStart((event) =>
          latest.current.onStart(
            origin.current.x,
            origin.current.y,
            event.absoluteX,
            event.absoluteY,
          ),
        )
        .onUpdate((event) => latest.current.onMove(event.absoluteX, event.absoluteY))
        .onEnd((event, success) => {
          latest.current.onMove(event.absoluteX, event.absoluteY);
          latest.current.onFinish(success);
        })
        .onFinalize(() => latest.current.onFinish(false)),
    [props.enabled],
  );
  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View
        ref={props.viewRef}
        collapsable={false}
        onLayout={props.onLayout}
        style={{ flex: 1, minHeight: 0, minWidth: 0 }}
      >
        {props.children}
      </View>
    </GestureDetector>
  );
}
