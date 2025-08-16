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
import { PurrMDConfig, PurrMDThemeConfig } from 'purrmd';

import { defaultDetectLanguage } from './detectLanguage';

export interface LonaEditorConfig {
  /** root */
  root: Element | DocumentFragment;
  /** 文件路径 @default undefined */
  filePath?: string;
  /** 默认值 @default '' */
  defaultValue?: string | null;
  /** 只读模式 @default false */
  readOnly?: boolean;
  /** 扩展 */
  extensions?: Extension[] | null;
  /** 扩展配置 */
  extensionsConfig?: {
    /** 禁用所有插件 @default false */
    disableAll?: boolean;
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
    /** 是否启用括号匹配 @default false */
    enableBracketMatching?: boolean;
    /** 是否启用自动补全右括号 @default true */
    enableCloseBrackets?: boolean;
    /** 是否启用自动完成 @default true */
    enableAutoCompletion?: boolean;
    /** 是否启用Alt矩形选择 @default true */
    enableRectangularSelection?: boolean;
    /** 是否启用十字光标 @default true */
    enableCrosshairCursor?: boolean;
    /** 是否启用高亮激活行 @default false */
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
  theme?:
    | 'light'
    | 'dark'
    | 'none'
    | { mode: 'light' | 'dark'; theme: Extension | null }
    | undefined;
  /** 语言检测函数并获取插件 */
  detectLanguage?: (filePath: string) => LanguageSupport[] | LanguageSupport | null;
  /** 检测Markdown语言并获取插件 */
  detectMarkdown?: (filePath: string) => LanguageSupport[] | LanguageSupport | null;
  markdownConfig?: PurrMDConfig;
  markdownTheme?: PurrMDThemeConfig;
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
    extensions,
    detectLanguage,
    theme,
    markdownConfig,
    markdownTheme,
  }: LonaEditorConfig) => {
    const {
      disableAll = false,
      enableLineWrapping = false,
      enableLineNumbers = true,
      enableHighlightSpecialChars = true,
      enableHistory = true,
      enableDrawSelection = false,
      enableDropCursor = false,
      enableAutoIndent = true,
      enableSyntaxHighlighting = false,
      enableBracketMatching = false,
      enableCloseBrackets = true,
      enableAutoCompletion = true,
      enableRectangularSelection = true,
      enableCrosshairCursor = true,
      enableHighlightActiveLine = false,
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
    const languages: Extension[] = [];
    const pushLanguage = (lang: Extension | Extension[] | null) => {
      if (Array.isArray(lang)) {
        languages.push(...lang);
      } else if (lang) {
        languages.push(lang);
      }
    };

    let resolveMode = 'light';
    let resolveTheme = null;
    if (typeof theme === 'string') {
      resolveMode = theme;
    } else if (theme) {
      resolveMode = theme.mode;
      resolveTheme = theme.theme;
    }
    pushLanguage(
      detectLanguage
        ? detectLanguage(filePath)
        : defaultDetectLanguage(filePath, {
            fileName: filePath,
            theme: {
              mode: resolveMode === 'none' ? 'base' : resolveMode === 'dark' ? 'dark' : 'light',
              ...(markdownTheme || {}),
            },
            config: markdownConfig,
          }),
    );

    const state = EditorState.create({
      doc: defaultValue || this.defaultValue || '',
      extensions: [
        this.#readOnlyEx.of(EditorView.editable.of(readOnly ? false : true)),
        focusChangeListener,
        // 自动换行
        !disableAll && enableLineWrapping ? EditorView.lineWrapping : null,
        updateListener,
        // 行号
        !disableAll && enableLineNumbers ? lineNumbers() : null,
        // 用占位符替换不可打印字符
        !disableAll && enableHighlightSpecialChars ? highlightSpecialChars() : null,
        // 撤销历史
        !disableAll && enableHistory ? history() : null,
        // 替换原始光标选区
        !disableAll && enableDrawSelection ? drawSelection() : null,
        // 替换拖拽时的放置光标
        !disableAll && enableDropCursor ? dropCursor() : null,
        // Allow multiple cursors/selections
        !disableAll && allowMultipleSelections
          ? EditorState.allowMultipleSelections.of(true)
          : null,
        // 输入特定输入时自动缩进
        !disableAll && enableAutoIndent ? indentOnInput() : null,
        // 高亮显示
        !disableAll && enableSyntaxHighlighting ? syntaxHighlighting(defaultHighlightStyle) : null,
        // 高亮光标旁边的匹配括号
        !disableAll && enableBracketMatching ? bracketMatching() : null,
        // 自动补全右括号
        !disableAll && enableCloseBrackets ? closeBrackets() : null,
        // 自动完成系统
        !disableAll && enableAutoCompletion ? autocompletion() : null,
        // alt-drag 选择矩形区域
        !disableAll && enableRectangularSelection ? rectangularSelection() : null,
        // 按住 alt 时, 光标更改为十字
        !disableAll && enableCrosshairCursor ? crosshairCursor() : null,
        // 高亮激活的行
        !disableAll && enableHighlightActiveLine ? highlightActiveLine() : null,
        // Style the gutter for current line specially
        // highlightActiveLineGutter(),
        // 突出显示与所选文本匹配的文本
        !disableAll && enableHighlightSelectionMatches ? highlightSelectionMatches() : null,
        // 折叠功能
        !disableAll && enableFoldGutter ? foldGutter() : null,
        ...(extensions || []),
        ...languages,
        resolveTheme,
        keymap.of(
          [
            // 保存功能
            saveBinding,
            // 按Tab键缩进
            !disableAll && enableDefaultKeymap ? indentWithTab : null,
            // 关闭括号支持退格
            ...(!disableAll && enableDefaultKeymap ? closeBracketsKeymap : []),
            // 大量基本键绑定
            ...(!disableAll && enableDefaultKeymap ? defaultKeymap : []),
            // 搜索相关的键
            ...(!disableAll && enableDefaultKeymap ? searchKeymap : []),
            // Redo/undo 快捷键
            ...(!disableAll && enableDefaultKeymap ? historyKeymap : []),
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

  getScrollContainer = (): HTMLElement | null => {
    const node = this.#editor.scrollDOM;
    for (let cur: any | null = node; cur; ) {
      if (cur.scrollHeight <= cur.clientHeight) {
        cur = cur.parentNode;
        continue;
      }
      return cur;
    }
    return null;
  };

  isCursorInViewport = (container?: HTMLElement): boolean => {
    if (!this.#editor || !this.#editor.hasFocus) return false;

    container = container || this.#editor.scrollDOM;
    const pos = this.#editor.state.selection.main.head;
    const cursorCoords = this.#editor.coordsAtPos(pos);
    if (!cursorCoords) return false;

    const containerRect = container.getBoundingClientRect();
    let containerTop = containerRect.top;
    let containerBottom = containerRect.bottom;

    if (containerTop < 0) {
      const top = containerTop;
      containerTop = 0;
      containerBottom += -top;
    }
    const isViewport = cursorCoords.top >= containerTop && cursorCoords.bottom <= containerBottom;
    // console.log(
    //   'isViewport:',
    //   isViewport,
    //   cursorCoords.top,
    //   cursorCoords.bottom,
    //   containerTop,
    //   containerBottom,
    // );
    return isViewport;
  };

  getScrollToCursorValue = (container?: Element | null): number | undefined => {
    if (!this.#editor) return undefined;

    const pos = this.#editor.state.selection.main.head;
    const coords = this.#editor.coordsAtPos(pos);
    if (!coords) return undefined;

    container = container || this.getScrollContainer();
    const containerRect = container.getBoundingClientRect();
    let containerTop = containerRect.top;
    let containerBottom = containerRect.bottom;

    if (containerTop < 0) {
      const top = containerTop;
      containerTop = 0;
      containerBottom += -top;
    }

    if (coords.top < containerTop) {
      // 在上方
      const relativeTop = coords.top - containerRect.top;
      const scrollTop = container.scrollTop + relativeTop;
      // console.log('上方', coords.top, containerRect.top, scrollTop);
      return scrollTop;
    } else if (coords.bottom > containerBottom) {
      // 在下方
      const relativeTop = coords.bottom - containerRect.bottom;
      const scrollTop = container.scrollTop + relativeTop;
      // console.log('下方', coords.bottom, containerRect.bottom, scrollTop);
      return scrollTop;
    }
    return undefined;
  };

  scrollToCursor = (container?: Element | null) => {
    if (!this.#editor) return;

    const pos = this.#editor.state.selection.main.head;
    const coords = this.#editor.coordsAtPos(pos);
    if (!coords) return undefined;

    container = container || this.#editor.scrollDOM;
    const containerRect = container.getBoundingClientRect();
    let containerTop = containerRect.top;
    let containerBottom = containerRect.bottom;

    if (containerTop < 0) {
      const top = containerTop;
      containerTop = 0;
      containerBottom += -top;
    }

    if (coords.top < containerTop) {
      // 在上方
      this.#editor.dispatch({
        effects: EditorView.scrollIntoView(pos, {
          y: 'start',
          yMargin: 0,
        }),
      });
    } else if (coords.bottom > containerBottom) {
      // 在下方
      this.#editor.dispatch({
        effects: EditorView.scrollIntoView(pos, {
          y: 'end',
          yMargin: 0,
        }),
      });
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
