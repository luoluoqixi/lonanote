import { type ComponentRef, type ReactElement, useRef, useState } from "react";
import { Tooltip } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";

/** 文件路径的纯悬浮提示，标签栏与文件树共用交互和尺寸。触发容器应使用非 button role。 */
export function FilePathTooltip({
  children,
  path,
  disabled = false,
}: {
  children: ReactElement;
  path: string | null;
  disabled?: boolean;
}) {
  const enabled = !!path && !disabled;
  const triggerRef = useRef<ComponentRef<typeof Tooltip.Trigger>>(null);
  const openRef = useRef(false);
  const [alignOffset, setAlignOffset] = useState(0);
  return (
    <Tooltip
      content={path ?? ""}
      size="xs"
      disableHoverableContent
      onOpenChange={(open) => {
        openRef.current = open;
      }}
      triggerProps={{
        ref: triggerRef,
        disabled: !enabled,
        onPointerMove: (event) => {
          if (!enabled || openRef.current) return;
          const trigger = triggerRef.current;
          if (!trigger) return;
          if (isWeb()) {
            // 事件可能来自文件名或图标，必须以整个触发容器为坐标原点。
            const rect = (trigger as unknown as HTMLElement).getBoundingClientRect();
            const pointer = event.nativeEvent;
            const scale = rect.width / (trigger as unknown as HTMLElement).clientWidth;
            setAlignOffset((pointer.clientX - rect.left) / (scale || 1) + 12);
          } else {
            const x = event.nativeEvent.pageX;
            trigger.measureInWindow((left) => {
              if (!openRef.current) setAlignOffset(x - left + 12);
            });
          }
        },
        // 右键菜单关闭后恢复焦点不能重新打开提示。
        onFocus: (event) => event.preventDefault(),
      }}
      contentProps={{
        side: "bottom",
        align: "start",
        alignOffset,
        pointerEvents: "none",
        style: { maxWidth: 640, display: enabled ? "flex" : "none", cursor: "auto" },
      }}
    >
      {children}
    </Tooltip>
  );
}
