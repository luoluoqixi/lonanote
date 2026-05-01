import { invoke as rawInvoke } from "./invoke";
import { OS, isNative, isTauri } from "./runtime";
import type { InvokeArgs, InvokeCommand } from "./types";
import { InvokeError } from "./types";

export type { InvokeArgs, InvokeCommand } from "./types";
export { isTauri, isNative, isWeb, isInvokeAvailable, OS } from "./runtime";

export async function invoke<TResult = unknown>(
  command: InvokeCommand,
  args?: InvokeArgs,
): Promise<TResult> {
  if (!isTauri() && !isNative()) {
    throw new InvokeError(`invoke: not support Rust(runtime=${OS()})`, OS(), command);
  }
  return rawInvoke(command, args);
}
