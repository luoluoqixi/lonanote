import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu, type MenuOptions } from "@tauri-apps/api/menu";

import { clipboard } from "@/api/commands/system/clipboard";
import type { EditorCommand, EditorContextMenuPayload } from "@/assets/editor/src/bridge/protocol";

import { type EditorMenuAction, executeEditorMenuAction } from "./editor_menu_actions";

/** 只在 Web Tauri surface 中动态加载，iframe 不接触 Tauri API。 */
export async function showEditorNativeMenu({
  payload,
  x,
  y,
  editable,
  isCurrent,
  execute,
  onError,
}: {
  payload: EditorContextMenuPayload;
  x: number;
  y: number;
  editable: boolean;
  isCurrent(): boolean;
  execute(command: EditorCommand): Promise<unknown>;
  onError(error: unknown): void;
}) {
  const item = (text: string, action: EditorMenuAction, enabled = editable) => ({
    text,
    enabled,
    ...(typeof action === "object" && action.type === "mark.toggle"
      ? { checked: payload.activeMarks.includes(action.mark) }
      : {}),
    action: () => {
      void executeEditorMenuAction(action, {
        text: payload.text,
        isCurrent,
        execute,
        clipboard,
      }).catch(onError);
    },
  });
  const separator = { item: "Separator" as const };
  const items: NonNullable<MenuOptions["items"]> = [
    {
      text: "文本格式",
      enabled: editable,
      items: [
        item("加粗", { type: "mark.toggle", mark: "bold" }),
        item("斜体", { type: "mark.toggle", mark: "italic" }),
        item("删除线", { type: "mark.toggle", mark: "strikethrough" }),
        item("高亮", { type: "mark.toggle", mark: "highlight" }),
        item("行内代码", { type: "mark.toggle", mark: "inlineCode" }),
      ],
    },
    {
      text: "段落",
      enabled: editable,
      items: [
        item("正文", { type: "block.set", block: "paragraph" }),
        ...([1, 2, 3, 4, 5, 6] as const).map((level) =>
          item(`标题 ${level}`, { type: "block.set", block: "heading", level }),
        ),
        item("引用", { type: "block.set", block: "blockquote" }),
      ],
    },
    {
      text: "列表",
      enabled: editable,
      items: [
        item("无序列表", { type: "list.toggle", list: "unordered" }),
        item("有序列表", { type: "list.toggle", list: "ordered" }),
        item("任务列表", { type: "list.toggle", list: "task" }),
      ],
    },
    {
      text: "插入",
      enabled: editable,
      items: [
        item("链接", { type: "insert.link" }),
        item("图片", { type: "insert.image" }),
        item("代码块", { type: "insert.codeBlock" }),
        item("表格", { type: "insert.table" }),
        item("分隔线", { type: "insert.horizontalRule" }),
      ],
    },
    separator,
    item("剪切", "cut", editable && payload.from !== payload.to),
    item("复制", "copy", payload.from !== payload.to),
    item("粘贴", "paste"),
    item("全选", { type: "selection.selectAll" }, true),
    separator,
    item("撤销", { type: "history.undo" }, editable && payload.canUndo),
    item("重做", { type: "history.redo" }, editable && payload.canRedo),
  ];
  const menu = await Menu.new({ items });
  try {
    if (isCurrent()) await menu.popup(new LogicalPosition(x, y));
  } finally {
    await menu.close().catch(() => undefined);
  }
}
