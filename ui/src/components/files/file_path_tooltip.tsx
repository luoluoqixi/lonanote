import { type ReactElement, cloneElement, useRef, useState } from "react";
import type { ViewProps } from "react-native";
import { Tooltip } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";

/** 路径提示跟随初始悬浮位置，不接管触发容器的点击或布局。 */
export function FilePathTooltip({
  children,
  path,
  disabled = false,
}: {
  children: ReactElement<ViewProps>;
  path: string | null;
  disabled?: boolean;
}) {
  const enabled = !!path && !disabled;
  const hovering = useRef(false);
  const [open, setOpen] = useState(false);
  const [crossOffset, setCrossOffset] = useState(0);
  return (
    <Tooltip
      content={path ?? ""}
      isDisabled={!enabled}
      open={enabled && open}
      onOpenChange={(next) => {
        if (!next) setOpen(false);
        else {
          // React Aria 的 warm hover 可能先于子元素的 pointer enter 同步触发。
          queueMicrotask(() => {
            if (hovering.current) setOpen(true);
          });
        }
      }}
      contentProps={{
        herouiWebProps: {
          placement: "bottom start",
          crossOffset,
          style: { maxWidth: 640, pointerEvents: "none", cursor: "auto" },
        },
      }}
    >
      {cloneElement(children, {
        tabIndex: -1,
        onPointerEnter: (event) => {
          hovering.current = true;
          children.props.onPointerEnter?.(event);
        },
        onPointerLeave: (event) => {
          hovering.current = false;
          setOpen(false);
          children.props.onPointerLeave?.(event);
        },
        onPointerMove: (event) => {
          children.props.onPointerMove?.(event);
          if (!enabled || open || !isWeb()) return;
          // currentTarget 始终指向整行，避免子图标或文件名改变坐标原点。
          const element = event.currentTarget as unknown as HTMLElement;
          const rect = element.getBoundingClientRect();
          const scale = rect.width / element.clientWidth;
          setCrossOffset((event.nativeEvent.clientX - rect.left) / (scale || 1) + 12);
        },
      })}
    </Tooltip>
  );
}
