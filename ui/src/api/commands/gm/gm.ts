import { invoke } from "@/api/invoke";

import type { RemoveWorkspaceResult } from "../workspace/types";

type GmCommand = `gm.${string}`;

async function invokeGmResult<TResult>(command: GmCommand): Promise<TResult> {
  const result = await invoke<TResult>(command);
  if (result === undefined) {
    throw new Error(`Rust GM command ${command} 未返回结果`);
  }
  return result;
}

export const gm = {
  system: {
    getSystemLocale: (): Promise<string> => {
      return invokeGmResult("gm.system.get_system_locale");
    },
  },

  workspace: {
    resetInitialWorkspace: (): Promise<RemoveWorkspaceResult | null> => {
      return invokeGmResult("gm.workspace.reset_initial_workspace");
    },
  },
};
