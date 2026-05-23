export type InvokeCommand = string;
export type InvokeArgs = Record<string, unknown> | any | undefined;

export class InvokeError extends Error {
  readonly runtime: string;
  readonly command: string;

  constructor(message: string, runtime: string, command: string) {
    super(message);
    this.name = "InvokeError";
    this.runtime = runtime;
    this.command = command;
  }
}
