declare const __APP_VERSION__: string;

interface Window {
  isAndroid: boolean;
  isIOS: boolean;
  statusBarHeight?: number;
  isVirtualScrollEnabled?: boolean;
  isScrollable?: boolean;

  setupVConsole: () => Promise<any>;
  setAutoSave: (autoSave: boolean, autoSaveInterval: number, autoSaveFocusChange: boolean) => void;
  setColorMode: (mode: string, isUpdateEditor?: boolean) => Promise<any>;
  setStatusBarHeight: (statusBarHeight: number) => void;
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
