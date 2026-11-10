type ConflictDecision = "overwrite" | "discard" | "cancel";

let confirmationQueue: Promise<unknown> = Promise.resolve();

/** 多份文档的自动保存可能同时检测到冲突，确认框按顺序展示。 */
export function confirmExternalDocumentChange(title: string): Promise<ConflictDecision> {
  const task = confirmationQueue
    .catch(() => undefined)
    .then(async () => {
      const { confirmNative } = await import("rn-ui-kit");
      const choice = await confirmNative({
        title: "文件已被外部修改",
        message: `“${title}”的磁盘内容已发生变化。覆盖将写入当前编辑内容，丢弃将加载磁盘中的最新内容。`,
        buttons: [
          { key: "overwrite", text: "覆盖", style: "destructive" },
          { key: "discard", text: "丢弃" },
          { key: "cancel", text: "取消", style: "cancel" },
        ],
      });
      return choice === "overwrite" || choice === "discard" ? choice : "cancel";
    });
  confirmationQueue = task;
  return task;
}
