import { workspaceIndex } from "@/api/commands/workspace/workspace_index";

import { createWorkspaceExplorerStore } from "./workspace_explorer_store";

export const workspaceExplorerStore = createWorkspaceExplorerStore(workspaceIndex);
