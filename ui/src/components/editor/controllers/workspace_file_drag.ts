/** 凭据只在来源工作台登记文件列表，接收窗口不能自行提交任意路径。 */
export class WorkspaceFileDragTickets {
  private ticket: { token: string; workspaceId: string; paths: string[]; time: number } | null =
    null;
  constructor(private now = Date.now) {}
  begin(workspaceId: string, paths: string[]) {
    const token = crypto.randomUUID();
    this.ticket = { token, workspaceId, paths: [...new Set(paths)], time: this.now() };
    return token;
  }
  take(token: string, workspaceId: string | null) {
    const ticket = this.ticket;
    if (
      !ticket ||
      ticket.token !== token ||
      ticket.workspaceId !== workspaceId ||
      this.now() - ticket.time > 60000
    )
      throw new Error("文件拖放已失效或工作区已切换，请重新拖动");
    this.ticket = null;
    return ticket.paths;
  }
}

export const WORKSPACE_FILE_DRAG_TYPE = "application/x-lonanote-workspace-files";
export const WORKSPACE_TREE_DRAG_TYPE = "application/x-lonanote-workspace-tree";
