import type { Ctx } from '@milkdown/kit/ctx';
import { createSlice } from '@milkdown/kit/ctx';

import type { MilkdownFeature } from '../features';
import type { MilkdownEditor } from './editor';

export const milkdownEditorCtx = createSlice({} as MilkdownEditor, 'MilkdownEditorCtx');

export const FeaturesCtx = createSlice([] as MilkdownFeature[], 'FeaturesCtx');

export const editableCtx = createSlice(true, 'editable');

export function configureFeatures(features: MilkdownFeature[]) {
  return (ctx: Ctx) => {
    ctx.inject(FeaturesCtx, features);
  };
}
