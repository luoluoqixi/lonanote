import { markdown as codemirrorMarkdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState, Range, RangeSet, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { MarkdownConfig, Table } from '@lezer/markdown';
import markdoc, { Config } from '@markdoc/markdoc';

const tokenElement = ['InlineCode', 'Emphasis', 'StrongEmphasis', 'FencedCode', 'Link'];

const tokenHidden = ['HardBreak', 'LinkMark', 'EmphasisMark', 'CodeMark', 'CodeInfo', 'URL'];

const decorationHidden = Decoration.mark({ class: 'cm-markdoc-hidden' });
const decorationBullet = Decoration.mark({ class: 'cm-markdoc-bullet' });
const decorationCode = Decoration.mark({ class: 'cm-markdoc-code' });
const decorationTag = Decoration.mark({ class: 'cm-markdoc-tag' });

class MarkdownPlugin implements PluginValue {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet)
      this.decorations = this.process(update.view);
  }

  process(view: EditorView): DecorationSet {
    const widgets: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          if (node.name === 'MarkdocTag') widgets.push(decorationTag.range(node.from, node.to));

          if (node.name === 'FencedCode') widgets.push(decorationCode.range(node.from, node.to));

          if (
            (node.name.startsWith('ATXHeading') || tokenElement.includes(node.name)) &&
            cursor.from >= node.from &&
            cursor.to <= node.to
          )
            return false;

          if (
            node.name === 'ListMark' &&
            node.matchContext(['BulletList', 'ListItem']) &&
            cursor.from != node.from &&
            cursor.from != node.from + 1
          )
            widgets.push(decorationBullet.range(node.from, node.to));

          if (node.name === 'HeaderMark')
            widgets.push(decorationHidden.range(node.from, node.to + 1));

          if (tokenHidden.includes(node.name))
            widgets.push(decorationHidden.range(node.from, node.to));

          return;
        },
      });
    }

    return Decoration.set(widgets);
  }
}

class RenderBlockWidget extends WidgetType {
  rendered: string;

  constructor(
    public source: string,
    config: Config,
  ) {
    super();

    const document = markdoc.parse(source);
    const transformed = markdoc.transform(document, config);
    this.rendered = markdoc.renderers.html(transformed);
  }

  eq(widget: RenderBlockWidget): boolean {
    return widget.source === widget.source;
  }

  toDOM(): HTMLElement {
    const content = document.createElement('div');
    content.setAttribute('contenteditable', 'false');
    content.className = 'cm-markdoc-renderBlock';
    content.innerHTML = this.rendered;
    return content;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const patternTag =
  /{%\s*(?<closing>\/)?(?<tag>[a-zA-Z0-9-_]+)(?<attrs>\s+[^]+)?\s*(?<self>\/)?%}\s*$/m;

const replaceBlocks = (state: EditorState, config: Config, from?: number, to?: number) => {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;

  const tags: [number, number][] = [];
  const stack: number[] = [];

  syntaxTree(state).iterate({
    from,
    to,
    enter(node) {
      if (!['Table', 'Blockquote', 'MarkdocTag'].includes(node.name)) return;

      if (node.name === 'MarkdocTag') {
        const text = state.doc.sliceString(node.from, node.to);
        const match = text.match(patternTag);

        if (match?.groups?.self) {
          tags.push([node.from, node.to]);
          return;
        }

        if (match?.groups?.closing) {
          const last = stack.pop();
          if (last) tags.push([last, node.to]);
          return;
        }

        stack.push(node.from);
        return;
      }

      if (cursor.from >= node.from && cursor.to <= node.to) return false;

      const text = state.doc.sliceString(node.from, node.to);
      const decoration = Decoration.replace({
        widget: new RenderBlockWidget(text, config),
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));

      return;
    },
  });

  for (const [from, to] of tags) {
    if (cursor.from >= from && cursor.to <= to) continue;
    const text = state.doc.sliceString(from, to);
    const decoration = Decoration.replace({
      widget: new RenderBlockWidget(text, config),
      block: true,
    });

    decorations.push(decoration.range(from, to));
  }

  return decorations;
};

const renderBlock = (config: Config) => {
  return StateField.define<DecorationSet>({
    create(state) {
      return RangeSet.of(replaceBlocks(state, config), true);
    },

    update(decorations, transaction) {
      return RangeSet.of(replaceBlocks(transaction.state, config), true);
    },

    provide(field) {
      return EditorView.decorations.from(field);
    },
  });
};

const highlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    fontSize: '32px',
    textDecoration: 'none',
  },
  {
    tag: tags.heading2,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    fontSize: '28px',
    textDecoration: 'none',
  },
  {
    tag: tags.heading3,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    fontSize: '24px',
    textDecoration: 'none',
  },
  {
    tag: tags.heading4,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    fontSize: '22px',
    textDecoration: 'none',
  },
  { tag: tags.link, fontFamily: 'sans-serif', textDecoration: 'underline', color: 'blue' },
  { tag: tags.emphasis, fontFamily: 'sans-serif', fontStyle: 'italic' },
  { tag: tags.strong, fontFamily: 'sans-serif', fontWeight: 'bold' },
  { tag: tags.monospace, fontFamily: 'monospace' },
  { tag: tags.content, fontFamily: 'sans-serif' },
  { tag: tags.meta, color: 'darkgrey' },
]);

markdoc.transformer.findSchema = (node, config) => {
  return node.tag
    ? (config?.tags?.[node.tag] ?? config?.tags?.$$fallback)
    : config?.nodes?.[node.type];
};
const markdocConfig = {
  tags: {
    $$fallback: {
      transform(node, config) {
        const children = node.transformChildren(config);
        const className = 'cm-markdoc-fallbackTag';
        return new markdoc.Tag('div', { class: className }, [
          new markdoc.Tag('div', { class: `${className}--name` }, [node?.tag ?? '']),
          new markdoc.Tag('div', { class: `${className}--inner` }, children),
        ]);
      },
    },
    callout: {
      transform(node, config) {
        const children = node.transformChildren(config);
        const kind = node.attributes.type === 'warning' ? 'warning' : 'info';
        const icon = kind === 'warning' ? 'icon-exclamation' : 'icon-info';
        const className = `cm-markdoc-callout cm-markdoc-callout--${kind}`;
        return new markdoc.Tag('div', { class: className }, [
          new markdoc.Tag('span', { class: `icon ${icon}` }),
          new markdoc.Tag('div', {}, children),
        ]);
      },
    },
  },
} as Config;
const tagParser = {
  defineNodes: [{ name: 'MarkdocTag', block: true, style: tags.meta }],
  parseBlock: [
    {
      name: 'MarkdocTag',
      endLeaf(_cx, line) {
        return line.next == 123 && line.text.slice(line.pos).trim().startsWith('{%');
      },
      parse(cx, line) {
        if (line.next != 123) return false;

        const content = line.text.slice(line.pos).trim();
        if (!content.startsWith('{%') || !content.endsWith('%}')) return false;

        cx.addElement(cx.elt('MarkdocTag', cx.lineStart, cx.lineStart + line.text.length));
        cx.nextLine();
        return true;
      },
    },
  ],
} as MarkdownConfig;
export const markdown = () => {
  const mergedConfig = {
    codeLanguages: languages,
    extensions: [tagParser, Table],
  };
  return ViewPlugin.fromClass(MarkdownPlugin, {
    decorations: (v) => v.decorations,
    provide: () => [
      renderBlock(markdocConfig),
      syntaxHighlighting(highlightStyle),
      codemirrorMarkdown(mergedConfig),
    ],
    eventHandlers: {
      mousedown: ({ target }, view) => {
        if (target instanceof Element && target.matches('.cm-markdoc-renderBlock *'))
          view.dispatch({ selection: { anchor: view.posAtDOM(target) } });
      },
    },
  });
};
