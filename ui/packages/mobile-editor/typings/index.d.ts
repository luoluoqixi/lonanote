declare const __APP_VERSION__: string;

interface Window {
  setupVConsole: () => Promise<any>;
  setColorMode: (mode: string) => Promise<any>;
  initEditor: (fileName: string, sourceMode: bool, content: string) => Promise<any>;
  invokeCommand: (command: string, data: any) => Promise<any>;
  getContent?: () => string | null;
  editor?: import('lonanote-markdown-editor').MarkdownEditor | null;
  cmEditor?: import('@codemirror/view').EditorView | null;
  EditorBridge: any;

  fileContent?: string;
  fileName?: string;
  previewMode?: boolean;
  sourceMode?: boolean;
  colorMode?: string;

  autoSaveInterval?: number;
  autoSave?: boolean;
  autoSaveFocusChange?: boolean;
}
