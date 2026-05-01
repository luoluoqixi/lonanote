import { LonanoteRustModule } from "lonanote_rust_module";

import type { InvokeArgs, InvokeCommand } from "./types";

/* eslint-disable @typescript-eslint/no-unused-vars */
export function invoke<TResult = unknown>(command: InvokeCommand, args?: InvokeArgs): TResult {
  return Promise.resolve(LonanoteRustModule.add(1, 2)) as any;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function invokeSync<TResult = unknown>(command: InvokeCommand, args?: InvokeArgs): TResult {
  throw new Error("invokeSync is not supported in this environment");
}
