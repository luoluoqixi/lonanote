import { assertWindowCanOpen } from "@/api/common/window_close_preparation";
import { invoke } from "@/api/invoke";
import type { InvokeArgs } from "@/api/invoke";

type WorkspaceCommand = `workspace.${string}`;

export async function invokeWorkspaceResult<TResult>(
  command: WorkspaceCommand,
  args?: InvokeArgs,
): Promise<TResult> {
  if (
    [
      "workspace.open",
      "workspace.open_with_diagnostics",
      "workspace.create_managed",
      "workspace.create_external",
      "workspace.resolve_id_mismatch",
    ].includes(command)
  )
    assertWindowCanOpen();
  const result = await invoke<TResult>(command, args);

  if (result === undefined) {
    throw new Error(`Rust command ${command} 未返回结果`);
  }

  return result;
}

export async function invokeWorkspaceUnit(
  command: WorkspaceCommand,
  args?: InvokeArgs,
): Promise<void> {
  await invoke(command, args);
}
