import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { ScrollView, View } from "react-native";

import { isWeb } from "@/api/common/platform";

import { readEditorTabGeometry } from "./editor_tab_geometry";
import { getTabDragScrollSpeed, getTabDropTarget } from "./editor_tab_reorder";

type DragSession = {
  id: string;
  title: string;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
};

export function useEditorTabDrag({
  ids,
  bounds,
  viewportRef,
  scrollRef,
  scrollPosition,
  contentWidth,
  tabNodes,
  moveEditor,
}: {
  ids: string[];
  bounds: RefObject<Map<string, { x: number; width: number }>>;
  viewportRef: RefObject<View | null>;
  scrollRef: RefObject<ScrollView | null>;
  scrollPosition: RefObject<number>;
  contentWidth: RefObject<number>;
  tabNodes: RefObject<Map<string, View>>;
  moveEditor: (id: string, beforeId: string | null) => void;
}) {
  const latest = useRef({ ids, moveEditor });
  latest.current = { ids, moveEditor };
  const session = useRef<DragSession | null>(null);
  const pending = useRef(0);
  const frame = useRef<number | null>(null);
  const suppressUntil = useRef(0);
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    left: number;
    marker: number;
  } | null>(null);

  const getGeometry = useCallback(
    (drag: DragSession) => {
      const geometry = readEditorTabGeometry(scrollRef.current, tabNodes.current);
      if (geometry) {
        Object.assign(drag, {
          left: geometry.left,
          top: geometry.top,
          width: geometry.width,
          height: geometry.height,
          scaleX: geometry.scaleX,
        });
        return geometry;
      }
      return {
        ...drag,
        bounds: bounds.current,
        scrollLeft: scrollPosition.current,
        contentWidth: contentWidth.current,
      };
    },
    [bounds, contentWidth, scrollPosition, scrollRef, tabNodes],
  );

  const finish = useCallback(
    (commit: boolean) => {
      pending.current++;
      const drag = session.current;
      session.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      setPreview(null);
      if (!drag) return;
      // 某些平台在释放拖动后还会派发 click，不能把它当作关闭或激活。
      suppressUntil.current = Date.now() + 200;
      const geometry = getGeometry(drag);
      if (
        commit &&
        drag.x >= drag.left - 32 &&
        drag.x <= drag.left + drag.width * drag.scaleX + 32 &&
        Math.abs(drag.y - (drag.top + drag.height / 2)) < drag.height / 2 + 32
      ) {
        const target = getTabDropTarget(
          latest.current.ids,
          geometry.bounds,
          drag.id,
          (drag.x - drag.left) / drag.scaleX + geometry.scrollLeft,
        );
        latest.current.moveEditor(drag.id, target.beforeId);
      }
    },
    [getGeometry],
  );

  useEffect(() => {
    if (!isWeb()) return;
    const cancel = () => finish(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish]);

  const start = useCallback(
    (id: string, title: string, x: number, y: number) => {
      const token = ++pending.current;
      viewportRef.current?.measureInWindow((left, top, width, height) => {
        if (pending.current !== token || !width || !latest.current.ids.includes(id)) return;
        session.current = { id, title, x, y, left, top, width, height, scaleX: 1 };
        let previousTime = 0;
        const tick = (time: number) => {
          const drag = session.current;
          if (!drag) return;
          if (!latest.current.ids.includes(drag.id)) {
            finish(false);
            return;
          }
          const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
          previousTime = time;
          const geometry = getGeometry(drag);
          const localX = (drag.x - drag.left) / drag.scaleX;
          const withinRow = drag.y >= drag.top - 32 && drag.y <= drag.top + drag.height + 32;
          const speed = withinRow ? getTabDragScrollSpeed(localX, drag.width) : 0;
          const nextScroll = Math.max(
            0,
            Math.min(
              Math.max(0, geometry.contentWidth - drag.width),
              geometry.scrollLeft + speed * elapsed,
            ),
          );
          if (nextScroll !== geometry.scrollLeft) {
            scrollPosition.current = nextScroll;
            scrollRef.current?.scrollTo({ x: nextScroll, animated: false });
          }
          const target = getTabDropTarget(
            latest.current.ids,
            geometry.bounds,
            id,
            localX + nextScroll,
          );
          const nextPreview = {
            id,
            title,
            left: Math.max(0, Math.min(localX - 35, drag.width - 80)),
            marker: target.x - nextScroll,
          };
          // 指针静止且没有滚动时，避免每帧重绘整个编辑区。
          setPreview((previous) =>
            previous?.id === nextPreview.id &&
            previous.left === nextPreview.left &&
            previous.marker === nextPreview.marker
              ? previous
              : nextPreview,
          );
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      });
    },
    [finish, getGeometry, scrollPosition, scrollRef, viewportRef],
  );

  const move = useCallback((x: number, y: number) => {
    if (session.current) Object.assign(session.current, { x, y });
  }, []);
  useEffect(
    () => () => {
      pending.current++;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return {
    preview,
    start,
    move,
    finish,
    isSuppressingPress: () => session.current !== null || Date.now() < suppressUntil.current,
  };
}
