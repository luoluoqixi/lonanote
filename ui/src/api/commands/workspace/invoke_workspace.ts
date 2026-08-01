import { invoke } from "@/api/invoke";
import type { InvokeArgs } from "@/api/invoke";

type WorkspaceCommand = `workspace.${string}`;

export async function invokeWorkspaceResult<TResult>(
  command: WorkspaceCommand,
  args?: InvokeArgs,
): Promise<TResult> {
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
