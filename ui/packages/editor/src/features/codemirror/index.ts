import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  LanguageDescription,
  bracketMatching,
  foldGutter,
  indentOnInput,
} from '@codemirror/language';
import { languages as langList } from '@codemirror/language-data';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  crosshairCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { editorViewCtx, editorViewOptionsCtx } from '@milkdown/core';
import { codeBlockComponent, codeBlockConfig } from '@milkdown/kit/component/code-block';
import { html } from 'atomico';

import { chevronDownIcon, clearIcon, editIcon, searchIcon, visibilityOffIcon } from '../../icons';
import { DefineFeature, Icon } from '../types';

interface CodeMirrorConfig {
  extensions: Extension[];
  languages: LanguageDescription[];
  theme: Extension;
  defaultReadOnly: boolean;
  readOnlyCtrl: Compartment;

  expandIcon: Icon;
  searchIcon: Icon;
  clearSearchIcon: Icon;

  searchPlaceholder: string;
  noResultText: string;

  renderLanguage: (language: string, selected: boolean) => ReturnType<typeof html> | string;
  renderPreview: (language: string, content: string) => string | HTMLElement | null;

  previewToggleIcon: (previewOnlyMode: boolean) => ReturnType<Icon>;
  previewToggleText: (previewOnlyMode: boolean) => ReturnType<typeof html>;
  previewLabel: () => ReturnType<typeof html>;
}

export type CodeMirrorFeatureConfig = Partial<CodeMirrorConfig>;

export const defineCodeMirror: DefineFeature<CodeMirrorFeatureConfig> = (editor, config) => {
  const mergeConfig = { ...config };
  editor
    .config((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { editable } = ctx.get(editorViewOptionsCtx);
      const editorDefaultReadOnly = editable == null ? false : !editable(view.state);

      mergeConfig.readOnlyCtrl = config?.readOnlyCtrl || new Compartment();
      mergeConfig.defaultReadOnly =
        mergeConfig.defaultReadOnly != null ? mergeConfig.defaultReadOnly : editorDefaultReadOnly;
      mergeConfig.languages = mergeConfig.languages || langList;
      mergeConfig.theme = mergeConfig.theme || oneDark;

      const { readOnlyCtrl, defaultReadOnly, languages, theme } = mergeConfig;

      ctx.update(codeBlockConfig.key, (defaultConfig) => ({
        extensions: [
          readOnlyCtrl.of(EditorView.editable.of(defaultReadOnly ? false : true)),
          // 行号
          lineNumbers(),
          // 用占位符替换不可打印字符
          highlightSpecialChars(),
          // 撤销历史
          history(),
          // // 替换原始光标选区
          // drawSelection(),
          // 替换拖拽时的放置光标
          // dropCursor(),
          // Allow multiple cursors/selections
          EditorState.allowMultipleSelections.of(true),
          // 输入特定输入时自动缩进
          indentOnInput(),
          // // 高亮显示
          // syntaxHighlighting(defaultHighlightStyle),
          // 高亮光标旁边的匹配括号
          bracketMatching(),
          // 自动补全右括号
          closeBrackets(),
          // 自动完成系统
          autocompletion(),
          // alt-drag 选择矩形区域
          rectangularSelection(),
          // 按住 alt 时, 光标更改为十字
          crosshairCursor(),
          // 高亮激活的行
          highlightActiveLine(),
          // Style the gutter for current line specially
          // highlightActiveLineGutter(),
          // 突出显示与所选文本匹配的文本
          // highlightSelectionMatches(),
          // 折叠功能
          foldGutter(),
          keymap.of([
            // 按Tab键缩进
            indentWithTab,
            // 关闭括号支持退格
            ...closeBracketsKeymap,
            // 大量基本键绑定
            ...defaultKeymap,
            // 搜索相关的键
            ...searchKeymap,
            // Redo/undo 快捷键
            ...historyKeymap,
          ]),
          theme,
          ...(config?.extensions ?? []),
        ],
        languages,
        expandIcon: mergeConfig.expandIcon || (() => chevronDownIcon),
        searchIcon: mergeConfig.searchIcon || (() => searchIcon),
        clearSearchIcon: mergeConfig.clearSearchIcon || (() => clearIcon),
        searchPlaceholder: mergeConfig.searchPlaceholder || 'Search language',
        noResultText: mergeConfig.noResultText || 'No result',
        renderLanguage: mergeConfig.renderLanguage || defaultConfig.renderLanguage,
        renderPreview: mergeConfig.renderPreview || defaultConfig.renderPreview,
        previewToggleButton: (previewOnlyMode) => {
          return html`
            ${mergeConfig.previewToggleIcon?.(previewOnlyMode) ||
            (previewOnlyMode ? editIcon : visibilityOffIcon)}
            ${mergeConfig.previewToggleText?.(previewOnlyMode) ||
            (previewOnlyMode ? 'Edit' : 'Hide')}
          `;
        },
        previewLabel: mergeConfig.previewLabel || defaultConfig.previewLabel,
      }));
    })
    .use(codeBlockComponent);

  return mergeConfig;
};
