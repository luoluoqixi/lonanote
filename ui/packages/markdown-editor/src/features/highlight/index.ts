import { InputRule } from '@milkdown/kit/prose/inputrules';
import { $inputRule, $node, $remark } from '@milkdown/kit/utils';

import { DefineFeature } from '../types';

/// https://github.com/orgs/Milkdown/discussions/1674

/**
 * custom-syntax-plugin: Parse `==content==` to `<mark>content</mark>`
 */
const remarkMark = $remark('remarkMark', () => () => (tree) => {
  const visit = (node) => {
    // only parse text node
    if (node.type === 'text' && typeof node.value === 'string') {
      const value = node.value;
      const regex = /==([^=]+)==/g;
      let match;
      let lastIndex = 0;
      const nodes = [];

      while ((match = regex.exec(value)) !== null) {
        // add before text node
        if (match.index > lastIndex) {
          nodes.push({
            type: 'text',
            value: value.slice(lastIndex, match.index),
          });
        }

        // add mark node
        nodes.push({
          type: 'mark',
          content: match[1],
        });

        //lastIndex = match.index + match[0].length;
        lastIndex = regex.lastIndex;
      }

      // add other text node
      if (lastIndex < value.length) {
        nodes.push({
          type: 'text',
          value: value.slice(lastIndex),
        });
      }

      return nodes.length > 0 ? nodes : [node];
    }

    // parse children nodes
    if (Array.isArray(node.children)) {
      node.children = node.children.flatMap(visit);
    }

    return [node];
  };

  tree.children = tree.children.flatMap(visit);
  return tree;
});

const markNode = $node('mark', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  marks: '',
  content: '',
  attrs: {
    content: { default: '' },
  },
  parseDOM: [
    {
      tag: 'mark',
      getAttrs: (dom) => ({
        content: dom.textContent,
      }),
    },
  ],
  toDOM: (node) => ['mark', {}, node.attrs.content],
  parseMarkdown: {
    match: (node) => node.type === 'mark',
    runner: (state, node, type) => {
      state.addNode(type, { content: node.content });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'mark',
    runner: (state, node) => {
      state.addNode('text', undefined, undefined, {
        value: `==${node.attrs.content}==`,
      });
    },
  },
}));

const markInputRule = $inputRule(
  (ctx) =>
    new InputRule(/==([^=]+)==/, (state, match, start, end) => {
      const [okay, content = ''] = match;
      const { tr } = state;
      if (okay) {
        tr.replaceWith(start, end, markNode.type(ctx).create({ content }));
      }
      return tr;
    }),
);

export const highlightMarkPlugin = [remarkMark, markInputRule, markNode].flat();

interface HiglightConfig {}

export type HiglightFeatureConfig = Partial<HiglightConfig>;

export const defineHiglight: DefineFeature<HiglightFeatureConfig> = (editor, config) => {
  const mergeConfig = { ...config };
  editor.use(highlightMarkPlugin);
  return mergeConfig;
};
