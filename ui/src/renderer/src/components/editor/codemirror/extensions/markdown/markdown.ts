import { markdown as codemirrorMarkdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { ViewPlugin } from '@codemirror/view';
import { GFM } from '@lezer/markdown';

const extensions = [];

export const markdown = () => {
  const mergedConfig = {
    codeLanguages: languages,
    extensions: [GFM, extensions],
  };
  // return ViewPlugin.fromClass(MarkdownPlugin, {
  //   decorations: (v) => v.decorations,
  //   provide: () => [codemirrorMarkdown(mergedConfig)],
  // });
  return [];
};
