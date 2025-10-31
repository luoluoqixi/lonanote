declare const __APP_VERSION__: string;

interface Window {
  /** Android */
  isAndroid: boolean;
  /** iOS */
  isIOS: boolean;
  /** editor 内容是否可滚动 */
  isScrollable?: boolean;

  /** 安装 VConsole */
  setupVConsole: () => Promise<any>;
  /** 设置自动保存配置 */
  setAutoSave: (autoSave: boolean, autoSaveInterval: number, autoSaveFocusChange: boolean) => void;
  /** 设置颜色模式 */
  setColorMode: (mode: string, primaryColor?: string, isUpdateEditor?: boolean) => Promise<any>;
  /** 设置标题高度 */
  setTitleHeight: (titleHeight: number) => void;
  /** 设置编辑器 */
  initEditor: (fileName: string, content: string) => any;
  /** 调用命令 */
  invokeCommand: (command: string, data: any) => Promise<any>;
  /** 获取 Editor 当前内容 */
  getContent?: () => string | null;
  /** Editor */
  editor?: import('../src/editor/core/LonaEditor').LonaEditor | null;
  /** Flutter Bridge */
  flutter_inappwebview: any;
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
  /** 主颜色 */
  primaryColor?: string;
  /** 是否显示源码模式行号 */
  isShowLineNumber?: boolean;

  /** 自动保存间隔 */
  autoSaveInterval?: number;
  /** 是否自动保存 */
  autoSave?: boolean;
  /** 失去焦点自动保存 */
  autoSaveFocusChange?: boolean;

  /** 基础路径 */
  basePath?: string | null;
}
