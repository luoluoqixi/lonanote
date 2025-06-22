import type { Ctx } from '@milkdown/kit/ctx';
import { createSlice } from '@milkdown/kit/ctx';

import type { MarkdownFeature } from '../features';
import { MarkdownBuilder } from './builder';

/// @internal
/// The feature flags context.
/// ⚠️ Most of the time, you should use `useMarkdownFeatures` to get the features.
export const MarkdownEditorCtx = createSlice({} as MarkdownBuilder, 'MilkdownEditorCtx');

export const FeaturesCtx = createSlice([] as MarkdownFeature[], 'FeaturesCtx');

export const editableCtx = createSlice(true, 'editable');

/// The crepe editor context.
/// You can use this context to access the crepe editor instance within Milkdown plugins.Add commentMore actions
/// ```ts
/// import { useMarkdown } from 'lonanote-markdown-editor'
/// const plugin = (ctx: Ctx) => {
///   return () => {
///     const crepe = useMarkdown(ctx)
///     crepe.setReadonly(true)
///   }
/// }
/// ```
export function useMarkdown(ctx: Ctx) {
  // We should use string slice here to avoid the slice to be bundled in multiple entries
  return ctx.get<MarkdownBuilder, 'MilkdownEditorCtx'>('MilkdownEditorCtx');
}

/// Check the enabled FeatureFlagsAdd commentMore actions
/// ```ts
/// import { useMarkdownFeatures } from 'lonanote-markdown-editor'
/// const plugin = (ctx: Ctx) => {
///   const features = useMarkdownFeatures(ctx)
///   if (features.get().includes(MarkdownFeature.CodeMirror)) {
///     // Do something with CodeMirror
///   }
/// }
export function useMarkdownFeatures(ctx: Ctx) {
  // We should use string slice here to avoid the slice to be bundled in multiple entries
  return ctx.use<MarkdownFeature[], 'FeaturesCtx'>('FeaturesCtx');
}

/// @internal
export function featureConfig(feature: MarkdownFeature) {
  return (ctx: Ctx) => {
    useMarkdownFeatures(ctx).update((features) => {
      if (features.includes(feature)) {
        return features;
      }
      return [...features, feature];
    });
  };
}
