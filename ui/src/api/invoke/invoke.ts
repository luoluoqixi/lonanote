import type { InvokeArgs, InvokeCommand } from "./types";

export async function invoke<TResult = unknown>(
  command: InvokeCommand,
  args?: InvokeArgs,
): Promise<TResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<TResult>(command, args as Record<string, unknown> | undefined);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invokeSync<TResult = unknown>(command: InvokeCommand, args?: InvokeArgs): TResult {
  throw new Error("invokeSync is not supported in this environment");
}
