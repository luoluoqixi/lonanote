import { invokeWorkspaceResult } from "./invoke_workspace";
import type { WorkspaceId, WorkspaceResourceScope } from "./types";

/** 资源内容不经 TypeScript command；这里只申请 WebView endpoint capability。 */
export const workspaceResource = {
  acquireScope: (workspaceId: WorkspaceId): Promise<WorkspaceResourceScope> => {
    return invokeWorkspaceResult("workspace.resource.acquire_scope", { workspaceId });
  },
};
