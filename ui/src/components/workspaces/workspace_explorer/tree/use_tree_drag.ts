import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "react-native";

import { isWeb } from "@/api/common/platform";

import { canStartTreeDrag, isTreeEditorDrop, readTreeDragBounds } from "./tree_drag_hit";
import {
  type TreeDragBounds,
  type TreeDrop,
  getTreeDragSources,
  resolveTreeDrop,
  treeRowAtPoint,
} from "./tree_drag_model";
import type { WorkspaceTreeRow } from "./tree_types";

type Options = {
  workspaceId: string;
  epoch: number;
  enabled: boolean;
  rows: WorkspaceTreeRow[];
  selectedPaths: string[];
  expandedPaths: string[];
  rowHeight: number;
  getOffset(): number;
  scrollTo(offset: number): void;
  select(path: string): void;
  expand(path: string): Promise<void>;
  move?(paths: string[], directory: string): void;
  open?(paths: string[]): void;
};
type Session = TreeDragBounds & {
  workspaceId: string;
  epoch: number;
  sources: string[];
  files: string[];
  x: number;
  y: number;
};
type Preview = { sources: string[]; target: TreeDrop | null; openPaths: string[] };

export function useTreeDrag(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const view = useRef<View | null>(null);
  const layoutHeight = useRef(0);
  const session = useRef<Session | null>(null);
  const pending = useRef(0);
  const frame = useRef<number | null>(null);
  const suppressUntil = useRef(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const currentTarget = useCallback((drag: Session) => {
    const props = latest.current;
    if (
      !props.enabled ||
      props.workspaceId !== drag.workspaceId ||
      props.epoch !== drag.epoch ||
      !props.move ||
      isTreeEditorDrop(drag.x, drag.y)
    )
      return null;
    const index = treeRowAtPoint(drag.x, drag.y, drag, props.getOffset(), props.rowHeight);
    return index === null ? null : resolveTreeDrop(drag.sources, props.rows, index);
  }, []);
  const currentOpenPaths = useCallback((drag: Session): string[] => {
    const props = latest.current;
    if (
      !props.enabled ||
      !props.open ||
      props.workspaceId !== drag.workspaceId ||
      props.epoch !== drag.epoch ||
      !isTreeEditorDrop(drag.x, drag.y)
    )
      return [];
    return drag.files;
  }, []);
  const finish = useCallback(
    (commit: boolean) => {
      pending.current++;
      const drag = session.current;
      session.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      setPreview(null);
      if (!drag) return;
      suppressUntil.current = Date.now() + 200;
      const openPaths = commit ? currentOpenPaths(drag) : [];
      if (openPaths.length) {
        isTreeEditorDrop(drag.x, drag.y, true);
        latest.current.open?.(openPaths);
      } else {
        const target = commit ? currentTarget(drag) : null;
        if (target) latest.current.move?.(target.paths, target.directory);
      }
    },
    [currentTarget, currentOpenPaths],
  );
  useEffect(() => {
    finish(false);
  }, [options.workspaceId, options.epoch, options.enabled, finish]);
  useEffect(() => {
    if (!isWeb()) return;
    const cancel = () => finish(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", escape, true);
    };
  }, [finish]);
  useEffect(
    () => () => {
      pending.current++;
      session.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const directory = preview?.target?.directory;
  useEffect(() => {
    if (!directory || latest.current.expandedPaths.includes(directory)) return;
    const timeout = setTimeout(() => {
      if (session.current && currentTarget(session.current)?.directory === directory)
        void latest.current.expand(directory).catch(() => undefined);
    }, 650);
    return () => clearTimeout(timeout);
  }, [directory, currentTarget]);
  const start = useCallback(
    (fromX: number, fromY: number, x: number, y: number) => {
      const token = ++pending.current;
      const workspaceId = latest.current.workspaceId;
      const epoch = latest.current.epoch;
      const begin = (bounds: TreeDragBounds) => {
        const props = latest.current;
        if (
          pending.current !== token ||
          !bounds.width ||
          !bounds.height ||
          !props.enabled ||
          props.workspaceId !== workspaceId ||
          props.epoch !== epoch
        )
          return;
        const index = treeRowAtPoint(fromX, fromY, bounds, props.getOffset(), props.rowHeight);
        const row = index === null ? null : props.rows[index];
        if (!row || row.kind !== "node" || !canStartTreeDrag(fromX, fromY, row.path)) return;
        const sources = getTreeDragSources(row.path, props.selectedPaths);
        if (!props.selectedPaths.includes(row.path)) props.select(row.path);
        // 打开保留显式选中的子文件；祖先去重仅适用于移动整个目录。
        const openSources = props.selectedPaths.includes(row.path)
          ? props.selectedPaths
          : [row.path];
        const files = [...new Set(openSources)].filter((path) =>
          props.rows.some(
            (row) => row.kind === "node" && row.path === path && row.entry.fileType === "file",
          ),
        );
        session.current = { ...bounds, workspaceId, epoch, sources, files, x, y };
        let previousTime = 0;
        const tick = (time: number) => {
          const drag = session.current;
          if (!drag) return;
          const current = latest.current;
          if (!current.enabled || current.workspaceId !== workspaceId || current.epoch !== epoch) {
            finish(false);
            return;
          }
          // 分栏 resize 后继续使用当前几何，不取消正在进行的拖拽。
          const bounds = readTreeDragBounds(view.current);
          if (bounds) Object.assign(drag, bounds);
          const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
          previousTime = time;
          const localY = (drag.y - drag.top) / drag.scaleY;
          const viewportHeight = drag.height / drag.scaleY;
          if (
            drag.x >= drag.left &&
            drag.x < drag.left + drag.width &&
            localY >= 0 &&
            localY < viewportHeight
          ) {
            const edge = Math.min(32, viewportHeight / 3);
            const speed =
              localY < edge
                ? -240 * (1 - localY / edge)
                : localY > viewportHeight - edge
                  ? 240 * (1 - (viewportHeight - localY) / edge)
                  : 0;
            const offset = current.getOffset();
            const next = Math.max(
              0,
              Math.min(
                Math.max(0, current.rows.length * current.rowHeight - viewportHeight),
                offset + speed * elapsed,
              ),
            );
            if (next !== offset) current.scrollTo(next);
          }
          const target = currentTarget(drag);
          const openPaths = currentOpenPaths(drag);
          setPreview((previous) =>
            previous &&
            previous.target?.directory === target?.directory &&
            previous.target?.rowPath === target?.rowPath &&
            previous.openPaths.length === openPaths.length
              ? previous
              : { sources, target, openPaths },
          );
          frame.current = requestAnimationFrame(tick);
        };
        setPreview({
          sources,
          target: currentTarget(session.current),
          openPaths: currentOpenPaths(session.current),
        });
        frame.current = requestAnimationFrame(tick);
      };
      // Web 容器是 DOM 元素，没有 RN 的 measureInWindow；直接读取实际边界。
      const bounds = readTreeDragBounds(view.current);
      if (bounds) {
        begin(bounds);
        return;
      }
      // Native 的异步测量仍受 token 保护，结束后不能迟到启动会话。
      view.current?.measureInWindow?.((left, top, width, height) => {
        begin({
          left,
          top,
          width,
          height,
          scaleY: layoutHeight.current ? height / layoutHeight.current : 1,
        });
      });
    },
    [currentTarget, currentOpenPaths, finish],
  );
  return {
    preview,
    nativeData: (x: number, y: number) => {
      const props = latest.current;
      const bounds = readTreeDragBounds(view.current);
      if (!props.enabled || !bounds) return null;
      const index = treeRowAtPoint(x, y, bounds, props.getOffset(), props.rowHeight);
      const row = index === null ? null : props.rows[index];
      if (!row || row.kind !== "node" || !canStartTreeDrag(x, y, row.path)) return null;
      const paths = props.selectedPaths.includes(row.path) ? props.selectedPaths : [row.path];
      const files = paths.filter((path) =>
        props.rows.some((r) => r.kind === "node" && r.path === path && r.entry.fileType === "file"),
      );
      return {
        workspaceId: props.workspaceId,
        files: props.open ? files : [],
        label: paths.length > 1 ? `${paths.length} 个项目` : row.path.split("/").at(-1)!,
      };
    },
    pointer: session,
    viewRef: (node: View | null) => {
      view.current = node;
    },
    onLayout: (height: number) => {
      layoutHeight.current = height;
    },
    start,
    move: (x: number, y: number) => {
      if (session.current) Object.assign(session.current, { x, y });
    },
    finish,
    isSuppressingPress: () => session.current !== null || Date.now() < suppressUntil.current,
  };
}
