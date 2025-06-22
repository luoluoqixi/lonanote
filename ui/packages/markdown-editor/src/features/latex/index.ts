import type { KatexOptions } from 'katex';
import katex from 'katex';

import { MarkdownFeature } from '../..';
import { FeaturesCtx } from '../../core/slice';
import { featureConfig } from '../../core/slice';
import { confirmIcon } from '../../icons';
// import { codeBlockConfig } from '@milkdown/kit/component/code-block';
import { codeBlockConfig } from '../codemirror/code-block';
import type { DefineFeature } from '../types';
import { blockLatexSchema } from './block-latex';
import { mathInlineSchema } from './inline-latex';
import { inlineLatexTooltip } from './inline-tooltip/tooltip';
import { LatexInlineTooltip } from './inline-tooltip/view';
import { mathBlockInputRule, mathInlineInputRule } from './input-rule';
import { remarkMathBlockPlugin, remarkMathPlugin } from './remark';

export interface LatexConfig {
  katexOptions: KatexOptions;
  inlineEditConfirm: string;
}

export type LatexFeatureConfig = Partial<LatexConfig>;

export const defineLatex: DefineFeature<LatexFeatureConfig> = (editor, config) => {
  editor
    .config(featureConfig(MarkdownFeature.Latex))
    .config((ctx) => {
      const flags = ctx.get(FeaturesCtx);
      const isCodeMirrorEnabled = flags.includes(MarkdownFeature.CodeMirror);
      if (!isCodeMirrorEnabled) {
        throw new Error('You need to enable CodeMirror to use LaTeX feature');
      }

      ctx.update(codeBlockConfig.key, (prev) => ({
        ...prev,
        renderPreview: (language, content) => {
          if (language?.toLowerCase() === 'latex' && content.length > 0) {
            return renderLatex(content, config?.katexOptions);
          }
          const renderPreview = prev.renderPreview;
          return renderPreview(language, content);
        },
      }));

      ctx.set(inlineLatexTooltip.key, {
        view: (view) => {
          return new LatexInlineTooltip(ctx, view, {
            inlineEditConfirm: config?.inlineEditConfirm ?? confirmIcon,
            ...config,
          });
        },
      });
    })
    .use(remarkMathPlugin)
    .use(remarkMathBlockPlugin)
    .use(mathInlineSchema)
    .use(inlineLatexTooltip)
    .use(mathInlineInputRule)
    .use(mathBlockInputRule)
    .use(blockLatexSchema);

  return config;
};

function renderLatex(content: string, options?: KatexOptions) {
  const html = katex.renderToString(content, {
    ...options,
    throwOnError: false,
    displayMode: true,
  });
  return html;
}
