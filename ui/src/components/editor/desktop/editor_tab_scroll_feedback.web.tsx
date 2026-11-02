import { type RefObject, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ScrollView } from "react-native";
import { useUiTheme } from "rn-ui-kit";

import {
  getEditorTabScrollFromThumb,
  getEditorTabScrollbar,
  getEditorTabWheelDelta,
} from "./editor_tab_scroll";

/** 标签栏专用的滚轮适配与可拖动滚动条，不占用标签布局空间。 */
export function EditorTabScrollFeedback({
  scrollRef,
}: {
  scrollRef: RefObject<ScrollView | null>;
}) {
  const theme = useUiTheme();
  const viewportId = useId();
  const [thumb, setThumb] = useState<{
    width: number;
    left: number;
    maxScroll: number;
    scrollLeft: number;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const drag = useRef<{ pointerId: number; grabOffset: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    if (!drag.current) hideTimer.current = setTimeout(() => setVisible(false), 1000);
  }, []);
  const stopDrag = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    show();
  }, [show]);

  useEffect(() => {
    const viewport = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
    if (!viewport) return;
    const previousId = viewport.id;
    viewport.id = viewportId;
    let frame: number | undefined;
    const refresh = () => {
      const geometry = getEditorTabScrollbar(
        viewport.clientWidth,
        viewport.scrollWidth,
        viewport.scrollLeft,
      );
      setThumb(
        geometry
          ? {
              ...geometry,
              maxScroll: viewport.scrollWidth - viewport.clientWidth,
              scrollLeft: viewport.scrollLeft,
            }
          : null,
      );
    };
    const onScroll = () => {
      show();
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        refresh();
      });
    };
    const onWheel = (event: WheelEvent) => {
      const delta = getEditorTabWheelDelta(event, viewport.clientWidth);
      if (!delta || viewport.scrollWidth <= viewport.clientWidth) return;
      // 非 passive 监听才能阻止默认滚动，避免横向位移被重复执行或传给正文。
      event.preventDefault();
      viewport.scrollLeft += delta;
      onScroll();
    };
    // 滑块与 ScrollView 是兄弟节点，共同父层才能覆盖滑块上的滚轮事件。
    const wheelTarget = viewport.parentElement ?? viewport;
    wheelTarget.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", stopDrag);
    const observer = new ResizeObserver(refresh);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    refresh();
    return () => {
      wheelTarget.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("scroll", onScroll);
      observer.disconnect();
      window.removeEventListener("blur", stopDrag);
      viewport.id = previousId;
      clearTimeout(hideTimer.current);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [scrollRef, show, stopDrag, viewportId]);

  return thumb ? (
    <div
      role="scrollbar"
      aria-label="编辑器标签栏滚动条"
      aria-controls={viewportId}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={thumb.maxScroll}
      aria-valuenow={thumb.scrollLeft}
      tabIndex={0}
      onFocus={show}
      onPointerEnter={show}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        drag.current = {
          pointerId: event.pointerId,
          grabOffset: event.clientX - event.currentTarget.getBoundingClientRect().left,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        show();
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        const viewport = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
        if (!viewport) return;
        const left =
          event.clientX - viewport.getBoundingClientRect().left - drag.current.grabOffset;
        viewport.scrollLeft = getEditorTabScrollFromThumb(
          viewport.clientWidth,
          viewport.scrollWidth,
          left,
        );
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        stopDrag();
      }}
      onPointerCancel={stopDrag}
      onLostPointerCapture={stopDrag}
      onKeyDown={(event) => {
        const viewport = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
        if (!viewport) return;
        const offsets: Record<string, number> = {
          ArrowLeft: -40,
          ArrowRight: 40,
          PageUp: -viewport.clientWidth,
          PageDown: viewport.clientWidth,
          Home: -viewport.scrollWidth,
          End: viewport.scrollWidth,
        };
        if (!(event.key in offsets)) return;
        event.preventDefault();
        event.stopPropagation();
        viewport.scrollLeft += offsets[event.key];
        show();
      }}
      style={{
        position: "absolute",
        bottom: 0,
        left: thumb.left,
        width: thumb.width,
        height: 7,
        opacity: visible ? 0.6 : 0,
        transition: "opacity 180ms ease-out",
        cursor: "ew-resize",
        touchAction: "none",
        userSelect: "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: 3,
          borderRadius: 2,
          backgroundColor: theme.mutedForeground,
        }}
      />
    </div>
  ) : null;
}
