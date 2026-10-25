import type { DropdownItemData } from "rn-ui-kit";

import type { EditorCommand, EditorContextMenuPayload } from "@/assets/editor/src/bridge/protocol";

import { type EditorMenuAction, executeEditorMenuAction } from "./editor_menu_actions";

/** 保留右键时的选区快照，菜单操作继续经过事务校验。 */
export function createEditorMenuItems({
  payload,
  clipboard,
  editable,
  isCurrent,
  execute,
  onError,
}: {
  payload: EditorContextMenuPayload;
  clipboard: { readText(): Promise<string>; writeText(text: string): Promise<void> };
  editable: boolean;
  isCurrent(): boolean;
  execute(command: EditorCommand): Promise<unknown>;
  onError(error: unknown): void;
}): DropdownItemData[] {
  const item = (text: string, action: EditorMenuAction, enabled = editable): DropdownItemData => ({
    value: text,
    textValue: text,
    disabled: !enabled,
    ...(typeof action === "object" && action.type === "mark.toggle"
      ? { selected: payload.activeMarks.includes(action.mark) }
      : {}),
    onSelect: async () => {
      if (!enabled) return;
      await executeEditorMenuAction(action, {
        text: payload.text,
        isCurrent,
        execute,
        clipboard,
      }).catch(onError);
    },
  });
  const separator = { value: "separator", separator: true };
  return [
    {
      value: "文本格式",
      textValue: "文本格式",
      disabled: !editable,
      subMenuTitle: false,
      subMenu: [
        item("加粗", { type: "mark.toggle", mark: "bold" }),
        item("斜体", { type: "mark.toggle", mark: "italic" }),
        item("删除线", { type: "mark.toggle", mark: "strikethrough" }),
        item("高亮", { type: "mark.toggle", mark: "highlight" }),
        item("行内代码", { type: "mark.toggle", mark: "inlineCode" }),
      ],
    },
    {
      value: "段落",
      textValue: "段落",
      disabled: !editable,
      subMenuTitle: false,
      subMenu: [
        item("正文", { type: "block.set", block: "paragraph" }),
        ...([1, 2, 3, 4, 5, 6] as const).map((level) =>
          item(`标题 ${level}`, { type: "block.set", block: "heading", level }),
        ),
        item("引用", { type: "block.set", block: "blockquote" }),
      ],
    },
    {
      value: "列表",
      textValue: "列表",
      disabled: !editable,
      subMenuTitle: false,
      subMenu: [
        item("无序列表", { type: "list.toggle", list: "unordered" }),
        item("有序列表", { type: "list.toggle", list: "ordered" }),
        item("任务列表", { type: "list.toggle", list: "task" }),
      ],
    },
    {
      value: "插入",
      textValue: "插入",
      disabled: !editable,
      subMenuTitle: false,
      subMenu: [
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
}
