declare const __APP_VERSION__: string;

interface Window {
  /** Android */
  isAndroid: boolean;
  /** iOS */
  isIOS: boolean;
  /** 状态栏高度 */
  statusBarHeight?: number;
  /** editor 内容是否可滚动 */
  isScrollable?: boolean;
  /** 是否使用 web scrollbar */
  isWebScrollbar?: boolean;

  /** 安装 VConsole */
  setupVConsole: () => Promise<any>;
  /** 设置自动保存配置 */
  setAutoSave: (autoSave: boolean, autoSaveInterval: number, autoSaveFocusChange: boolean) => void;
  /** 设置颜色模式 */
  setColorMode: (mode: string, isUpdateEditor?: boolean) => Promise<any>;
  /** 设置状态栏高度 */
  setStatusBarHeight: (statusBarHeight: number) => void;
  /** 设置是否使用 web scrollbar */
  setWebScrollbar: (isWebScrollbar: boolean) => void;
  /** 设置编辑器滚动条位置 */
  setEditorScrollbarValue: (value: number) => void;
  /** 设置编辑器 */
  initEditor: (fileName: string, sourceMode: bool, content: string) => Promise<any>;
  /** 调用命令 */
  invokeCommand: (command: string, data: any) => Promise<any>;
  /** 获取 Editor 当前内容 */
  getContent?: () => string | null;
  /** Markdown Editor */
  editor?: import('lonanote-markdown-editor').MarkdownEditor | null;
  /** CodeMirror Editor */
  cmEditor?: import('@codemirror/view').EditorView | null;
  /** Flutter Bridge */
  EditorBridge: any;

  /** 当前编辑器的内容 (保存后更新) */
  fileContent?: string;
  /** 当前文件名 */
  fileName?: string;
  /** 预览模式 */
  previewMode?: boolean;
  /** 源码模式 */
  sourceMode?: boolean;
  /** 颜色模式 dark light */
  colorMode?: string;

  /** 自动保存间隔 */
  autoSaveInterval?: number;
  /** 是否自动保存 */
  autoSave?: boolean;
  /** 失去焦点自动保存 */
  autoSaveFocusChange?: boolean;
}
