import { autocompletion, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { foldGutter, indentOnInput } from '@codemirror/language';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  crosshairCursor,
  highlightActiveLine,
  keymap,
  rectangularSelection,
} from '@codemirror/view';
import { editorViewCtx, editorViewOptionsCtx } from '@milkdown/core';
import { $node, $remark, $view } from '@milkdown/utils';
import type { NodeView } from 'prosemirror-view';
import remarkFrontmatter from 'remark-frontmatter';

import { DefineFeature } from '../types';

interface YamlConfig {
  readOnlyCtrl: Compartment;
  defaultReadOnly: boolean;
  theme: Extension;
}

export type YamlFeatureConfig = Partial<YamlConfig>;

export const YAML_NODE_KEY = 'yaml-frontmatter';

export const defineYaml: DefineFeature<YamlFeatureConfig> = (editor, config) => {
  const mergeConfig = { ...config };
  mergeConfig.readOnlyCtrl = config?.readOnlyCtrl || new Compartment();
  mergeConfig.theme = mergeConfig.theme || oneDark;

  const nodeKey = YAML_NODE_KEY;

  editor.use($remark('frontmatter-capture', () => remarkFrontmatter, 'yaml'));

  const yamlNode = $node(nodeKey, () => ({
    group: 'block',
    atom: true,
    selectable: false,
    isolating: true,
    attrs: { content: { default: '' } },
    parseDOM: [
      {
        tag: `div[data-type="${nodeKey}"]`,
        getAttrs: (dom: HTMLElement) => ({
          content: dom.dataset.content ?? '',
        }),
      },
    ],
    toDOM: (node) => [
      'div',
      {
        'data-type': nodeKey,
        'data-content': node.attrs.content,
      },
      0,
    ],
    parseMarkdown: {
      match: (node) => node.type === 'yaml',
      runner: (state, node) => {
        const content = (node.value as string).trim();
        state.addNode(state.schema.nodes[nodeKey], { content });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === nodeKey,
      runner: (state, node) => {
        state.addNode('yaml', undefined, node.attrs.content);
      },
    },
  }));

  const yamlView = $view(yamlNode, (ctx) => {
    const view = ctx.get(editorViewCtx);
    const { editable } = ctx.get(editorViewOptionsCtx);
    const editorDefaultReadOnly = editable == null ? false : !editable(view.state);
    const readOnly =
      mergeConfig.defaultReadOnly != null ? mergeConfig.defaultReadOnly : editorDefaultReadOnly;

    return (node) => {
      const container = document.createElement('div');
      container.className = 'milkdown-yaml-block';
      const content = node.attrs.content;

      const state = EditorState.create({
        doc: content,
        extensions: [
          mergeConfig?.readOnlyCtrl?.of(EditorView.editable.of(readOnly ? false : true)) || [],
          yaml(),
          //自动换行
          EditorView.lineWrapping,
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
          // 自动完成系统
          autocompletion(),
          // alt-drag 选择矩形区域
          rectangularSelection(),
          // 按住 alt 时, 光标更改为十字
          crosshairCursor(),
          // 高亮激活的行
          highlightActiveLine(),
          // 折叠功能
          foldGutter(),
          mergeConfig.theme || [],
          keymap.of([
            // 按Tab键缩进
            indentWithTab,
            // 关闭括号支持退格
            ...closeBracketsKeymap,
            // 大量基本键绑定
            ...defaultKeymap,
            // Redo/undo 快捷键
            ...historyKeymap,
          ]),
        ],
      });
      let view: EditorView | null = new EditorView({
        parent: container,
        state,
      });

      return {
        dom: container,
        ignoreMutation: () => true,
        destroy() {
          if (view) {
            view.destroy();
            view = null;
          }
        },
      } satisfies NodeView;
    };
  });

  editor.use(yamlNode).use(yamlView);

  return mergeConfig;
};
