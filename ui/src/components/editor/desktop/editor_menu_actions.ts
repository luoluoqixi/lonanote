import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";

export type EditorMenuAction = "copy" | "cut" | "paste" | EditorCommand;

/** 剪贴板等待后必须重新验证事务，写入失败时绝不删除选区。 */
export async function executeEditorMenuAction(
  action: EditorMenuAction,
  context: {
    text: string;
    isCurrent(): boolean;
    execute(command: EditorCommand): Promise<unknown>;
    clipboard: { readText(): Promise<string>; writeText(text: string): Promise<void> };
  },
) {
  if (!context.isCurrent()) return;
  if (action === "copy" || action === "cut") {
    await context.clipboard.writeText(context.text);
    if (action === "cut" && context.isCurrent())
      await context.execute({ type: "selection.replace", text: "" });
    return;
  }
  if (action === "paste") {
    const text = await context.clipboard.readText();
    if (context.isCurrent()) await context.execute({ type: "selection.replace", text });
    return;
  }
  if (context.isCurrent()) await context.execute(action);
}
