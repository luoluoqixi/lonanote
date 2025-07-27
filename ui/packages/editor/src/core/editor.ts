// 关于锁定CodeMirror版本:
// CodeMirror6的某个版本出现了一个bug, 中文输入法输入时会偶尔跳到左上角
// 此bug是Chrome的bug, 似乎已经修复, 但需要升级Chrome和Electron
// https://github.com/codemirror/dev/issues/1396
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands';
import {
  LanguageSupport,
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension, Transaction } from '@codemirror/state';
import {
  EditorView,
  KeyBinding,
  ViewUpdate,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { vsCodeDark } from '@fsegurai/codemirror-theme-vscode-dark';
import { vsCodeLight } from '@fsegurai/codemirror-theme-vscode-light';

import { defaultDetectLanguage, defaultDetectMarkdown } from './detectLanguage';

export interface LonaEditorConfig {
  /** root */
  root: Element | DocumentFragment;
  /** 文件路径 @default undefined */
  filePath?: string;
  /** 默认值 @default '' */
  defaultValue?: string | null;
  /** 只读模式 @default false */
  readOnly?: boolean;
  /** 扩展配置 */
  extensionsConfig?: {
    /** 自动换行 @default false */
    enableLineWrapping?: boolean;
    /** 行号 @default true */
    enableLineNumbers?: boolean;
    /** 高亮特殊字符 @default true */
    enableHighlightSpecialChars?: boolean;
    /** 历史记录 @default true */
    enableHistory?: boolean;
    /** 是否启用矩形选择 @default false */
    enableDrawSelection?: boolean;
    /** 是否启用拖拽时的放置光标 @default false */
    enableDropCursor?: boolean;
    /** 是否启用自动缩进 @default true */
    enableAutoIndent?: boolean;
    /** 是否启用默认语法高亮 @default false */
    enableSyntaxHighlighting?: boolean;
    /** 是否启用括号匹配 @default true */
    enableBracketMatching?: boolean;
    /** 是否启用自动补全右括号 @default true */
    enableCloseBrackets?: boolean;
    /** 是否启用自动完成 @default true */
    enableAutoCompletion?: boolean;
    /** 是否启用Alt矩形选择 @default true */
    enableRectangularSelection?: boolean;
    /** 是否启用十字光标 @default true */
    enableCrosshairCursor?: boolean;
    /** 是否启用高亮激活行 @default true */
    enableHighlightActiveLine?: boolean;
    /** 是否启用高亮匹配的文本 @default false */
    enableHighlightSelectionMatches?: boolean;
    /** 是否启用折叠功能 @default true */
    enableFoldGutter?: boolean;
    /** 是否启用默认快捷键 @default true */
    enableDefaultKeymap?: boolean;
    /** 是否允许多重选择 @default true */
    allowMultipleSelections?: boolean;
  };
  /** 自定义快捷键 */
  keyBindings?: KeyBinding[] | null;
  /** 主题 @default light */
  theme?: 'light' | 'dark' | 'none' | Extension | undefined;
  /** 语言检测函数并获取插件 */
  detectLanguage?: (filePath: string) => LanguageSupport[] | LanguageSupport | null;
  /** 检测Markdown语言并获取插件 */
  detectMarkdown?: (filePath: string) => LanguageSupport[] | LanguageSupport | null;
}

export interface LonaEditorStatusInfo {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export interface LonaEditorEvent {
  onSave: (editor: LonaEditor) => void;
  onCreated: (editor: LonaEditor) => void;
  onUpdate: (editor: LonaEditor, update: ViewUpdate) => void;
  onDestroy: (editor: LonaEditor) => void;
  onFocus: (editor: LonaEditor, focus: boolean, event: FocusEvent) => void;
}

export interface LonaEditorSetValueOptions {
  useHistory?: boolean | undefined;
  scrollToTop?: boolean;
}

type LonaEditorEventListeners = {
  [K in keyof LonaEditorEvent]?: LonaEditorEvent[K][];
};

export class LonaEditor {
  #editor: EditorView | null;
  defaultValue?: string;
  #root: Element | DocumentFragment | null;
  readonly #readOnlyEx: Compartment;
  readonly #events: LonaEditorEventListeners;

  constructor() {
    this.#readOnlyEx = new Compartment();
    this.#events = {};
  }

  get editor(): EditorView {
    return this.#editor;
  }

  get root() {
    return this.#root;
  }

  create = ({
    root,
    defaultValue,
    readOnly,
    filePath,
    extensionsConfig,
    keyBindings,
    detectLanguage,
    detectMarkdown,
    theme,
  }: LonaEditorConfig) => {
    const {
      enableLineWrapping = false,
      enableLineNumbers = true,
      enableHighlightSpecialChars = true,
      enableHistory = true,
      enableDrawSelection = false,
      enableDropCursor = false,
      enableAutoIndent = true,
      enableSyntaxHighlighting = false,
      enableBracketMatching = true,
      enableCloseBrackets = true,
      enableAutoCompletion = true,
      enableRectangularSelection = true,
      enableCrosshairCursor = true,
      enableHighlightActiveLine = true,
      enableHighlightSelectionMatches = false,
      enableFoldGutter = true,
      enableDefaultKeymap = true,
      allowMultipleSelections = true,
    } = extensionsConfig || {};
    if (this.#editor != null) {
      console.warn('LonaEditor already created.');
      return;
    }
    this.#root = root;
    const saveBinding: KeyBinding = {
      key: 'Mod-s', // Mod 代表 Ctrl（Windows）或 Cmd（Mac）
      preventDefault: true,
      run: () => {
        this.#onSave();
        return true;
      },
    };
    const focusChangeListener = EditorView.domEventHandlers({
      focus: (event) => this.#onFocus(true, event),
      blur: (event) => this.#onFocus(false, event),
    });
    const updateListener = EditorView.updateListener.of((update) => {
      this.#onUpdate(update);
    });
    let resolveTheme = null;
    if (typeof theme === 'string') {
      if (theme !== 'none') {
        resolveTheme = theme === 'dark' ? vsCodeDark : vsCodeLight;
      }
    } else if (theme) {
      resolveTheme = theme;
    }
    const languages: LanguageSupport[] = [];
    const pushLanguage = (lang: LanguageSupport | LanguageSupport[] | null) => {
      if (Array.isArray(lang)) {
        languages.push(...lang);
      } else if (lang) {
        languages.push(lang);
      }
    };
    pushLanguage(detectLanguage ? detectLanguage(filePath) : defaultDetectLanguage(filePath));
    pushLanguage(detectMarkdown ? detectMarkdown(filePath) : defaultDetectMarkdown(filePath));
    const state = EditorState.create({
      doc: defaultValue || this.defaultValue || '',
      extensions: [
        this.#readOnlyEx.of(EditorView.editable.of(readOnly ? false : true)),
        ...languages,
        focusChangeListener,
        // 自动换行
        enableLineWrapping ? EditorView.lineWrapping : null,
        updateListener,
        // 行号
        enableLineNumbers ? lineNumbers() : null,
        // 用占位符替换不可打印字符
        enableHighlightSpecialChars ? highlightSpecialChars() : null,
        // 撤销历史
        enableHistory ? history() : null,
        // 替换原始光标选区
        enableDrawSelection ? drawSelection() : null,
        // 替换拖拽时的放置光标
        enableDropCursor ? dropCursor() : null,
        // Allow multiple cursors/selections
        allowMultipleSelections ? EditorState.allowMultipleSelections.of(true) : null,
        // 输入特定输入时自动缩进
        enableAutoIndent ? indentOnInput() : null,
        // 高亮显示
        enableSyntaxHighlighting ? syntaxHighlighting(defaultHighlightStyle) : null,
        // 高亮光标旁边的匹配括号
        enableBracketMatching ? bracketMatching() : null,
        // 自动补全右括号
        enableCloseBrackets ? closeBrackets() : null,
        // 自动完成系统
        enableAutoCompletion ? autocompletion() : null,
        // alt-drag 选择矩形区域
        enableRectangularSelection ? rectangularSelection() : null,
        // 按住 alt 时, 光标更改为十字
        enableCrosshairCursor ? crosshairCursor() : null,
        // 高亮激活的行
        enableHighlightActiveLine ? highlightActiveLine() : null,
        // Style the gutter for current line specially
        // highlightActiveLineGutter(),
        // 突出显示与所选文本匹配的文本
        enableHighlightSelectionMatches ? highlightSelectionMatches() : null,
        // 折叠功能
        enableFoldGutter ? foldGutter() : null,
        resolveTheme,
        keymap.of(
          [
            // 保存功能
            saveBinding,
            // 按Tab键缩进
            enableDefaultKeymap ? indentWithTab : null,
            // 关闭括号支持退格
            ...(enableDefaultKeymap ? closeBracketsKeymap : []),
            // 大量基本键绑定
            ...(enableDefaultKeymap ? defaultKeymap : []),
            // 搜索相关的键
            ...(enableDefaultKeymap ? searchKeymap : []),
            // Redo/undo 快捷键
            ...(enableDefaultKeymap ? historyKeymap : []),
            ...(keyBindings || []),
          ].filter(Boolean) as KeyBinding[],
        ),
      ].filter(Boolean),
    });
    this.#editor = new EditorView({
      parent: root,
      state,
    });
    this.#onCreated();
  };

  destroy = () => {
    for (const k in this.#events) {
      this.#events[k] = undefined;
    }
    if (this.#editor) {
      this.#editor.destroy();
      this.#editor = null;
      this.#onDestroy();
    }
  };

  getValue = () => {
    if (!this.#editor) return null;
    return this.#editor.state.doc.toString();
  };

  setValue = (content: string, { useHistory, scrollToTop = true }: LonaEditorSetValueOptions) => {
    try {
      if (!this.#editor) return;
      this.#editor.dispatch({
        annotations: useHistory ? undefined : Transaction.addToHistory.of(false),
        changes: {
          from: 0,
          to: this.#editor.state.doc.length,
          insert: content || '',
        },
      });

      if (scrollToTop) {
        this.#editor.dispatch({
          effects: EditorView.scrollIntoView(0),
        });
      }
    } catch (e) {
      console.error('setValue Error', e);
      throw e;
    }
  };

  setReadonly = (readOnly: boolean) => {
    if (this.#editor && this.#readOnlyEx) {
      this.#editor.dispatch({
        effects: this.#readOnlyEx.reconfigure(EditorView.editable.of(!readOnly)),
      });
    }
  };

  /// 获取焦点并设置光标到最后位置
  focus = (pos?: { x: number; y: number }) => {
    if (!this.#editor) throw new Error('Editor not initialized');
    const lastLine = this.#editor.state.doc.lines;
    const lastPos = this.#editor.state.doc.line(lastLine).to;
    let targetPos: number;
    if (pos) {
      const found = this.#editor.posAtCoords(pos);
      if (found !== null) {
        targetPos = found;
      } else {
        const domRect = this.#editor.dom.getBoundingClientRect();
        if (pos.y < domRect.top) {
          targetPos = 0; // 在编辑器上方，光标放文档开头
        } else if (pos.y > domRect.bottom) {
          targetPos = lastPos; // 在编辑器下方，光标放文档末尾
        } else {
          targetPos = lastPos;
        }
      }
    } else {
      targetPos = lastPos;
    }

    this.#editor.dispatch({
      selection: { anchor: targetPos, head: targetPos },
      effects: EditorView.scrollIntoView(targetPos, { y: 'center' }),
    });
    this.#editor.focus();
  };

  getStatusInfo = (): LonaEditorStatusInfo => {
    if (!this.#editor) throw new Error('Editor not initialized');
    const charCount = this.#editor.state.doc.length;
    const cursorPos = this.#editor.state.selection.main.head;
    const line = this.#editor.state.doc.lineAt(cursorPos);
    const rowIndex = line.number;
    const colIndex = cursorPos - line.from;
    return { charCount, rowIndex, colIndex };
  };

  isCursorInViewport = (container?: HTMLElement): boolean => {
    if (!this.#editor || !this.#editor.hasFocus) return false;

    container = container || this.#editor.scrollDOM;
    const pos = this.#editor.state.selection.main.head;
    const cursorCoords = this.#editor.coordsAtPos(pos);
    if (!cursorCoords) return false;

    const containerRect = container.getBoundingClientRect();

    return (
      cursorCoords.top >= containerRect.top &&
      cursorCoords.bottom <= containerRect.bottom &&
      cursorCoords.left >= containerRect.left &&
      cursorCoords.right <= containerRect.right
    );
  };

  scrollToCursor = () => {
    if (!this.#editor) return;
    const pos = this.#editor.state.selection.main.head;
    this.#editor.dispatch({
      effects: EditorView.scrollIntoView(pos, {
        y: 'nearest',
        yMargin: 0,
      }),
    });
  };

  autoScrollToCursor = (container?: HTMLElement) => {
    if (!this.#editor) return;
    if (this.#editor.hasFocus) {
      if (!this.isCursorInViewport(container)) {
        this.scrollToCursor();
      }
    }
  };

  canUndo = () => {
    return undoDepth(this.#editor.state) > 0;
  };

  canRedo = () => {
    return redoDepth(this.#editor.state) > 0;
  };

  undo = () => {
    undo(this.#editor);
  };

  redo = () => {
    redo(this.#editor);
  };

  addListener = <K extends keyof LonaEditorEvent>(type: K, listener: LonaEditorEvent[K]): void => {
    if (!this.#editor) throw new Error('Editor not initialized');
    if (!this.#events[type]) {
      this.#events[type] = [];
    }
    this.#events[type].push(listener);
  };

  removeListener = <K extends keyof LonaEditorEvent>(
    type: K,
    listener: LonaEditorEvent[K],
  ): void => {
    if (!this.#events[type]) {
      return;
    }
    const index = this.#events[type].indexOf(listener);
    if (index >= 0) {
      this.#events[type].splice(index, 1);
    }
  };

  clearListener = <K extends keyof LonaEditorEvent>(type: K): void => {
    if (!this.#events[type]) {
      return;
    }
    this.#events[type] = undefined;
  };

  #callEvent = <K extends keyof LonaEditorEvent>(
    type: K,
    ...args: Parameters<LonaEditorEvent[K]>
  ) => {
    const listener = this.#events[type];
    if (listener) {
      for (let i = 0; i < listener.length; i++) {
        const cb = listener[i];
        if (cb) {
          try {
            (cb as any)(...args);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  };

  #onSave = () => {
    this.#callEvent('onSave', this);
    return true;
  };

  #onCreated = () => {
    this.#callEvent('onCreated', this);
  };

  #onDestroy = () => {
    this.#callEvent('onDestroy', this);
  };

  #onFocus = (focus: boolean, event: FocusEvent) => {
    this.#callEvent('onFocus', this, focus, event);
  };

  #onUpdate = (update: ViewUpdate) => {
    this.#callEvent('onUpdate', this, update);
  };
}
