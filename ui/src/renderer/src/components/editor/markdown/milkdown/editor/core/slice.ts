import type { Ctx } from '@milkdown/kit/ctx';
import { createSlice } from '@milkdown/kit/ctx';

import type { MilkdownEditor } from './editor';
import type { MilkdownFeature } from './features';

export const milkdownEditorCtx = createSlice({} as MilkdownEditor, 'MilkdownEditorCtx');

export const FeaturesCtx = createSlice([] as MilkdownFeature[], 'FeaturesCtx');

export function configureFeatures(features: MilkdownFeature[]) {
  return (ctx: Ctx) => {
    ctx.inject(FeaturesCtx, features);
  };
}
