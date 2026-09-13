import type { EditorConsolePayload } from "@/assets/editor/src/bridge/protocol";

const editorConsoleMethods = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
} satisfies Record<EditorConsolePayload["level"], (...data: unknown[]) => void>;

export function logEditorConsole(payload: EditorConsolePayload): void {
  editorConsoleMethods[payload.level](
    `[editor_webview:${payload.source}:${payload.level}]`,
    ...payload.arguments,
  );
}
