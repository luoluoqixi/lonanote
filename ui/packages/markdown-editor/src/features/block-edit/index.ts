import { block } from '@milkdown/kit/plugin/block';

import { MarkdownFeature } from '..';
import { featureConfig } from '../../core/slice';
import type { DeepPartial } from '../../utils';
import type { GroupBuilder } from '../../utils/group-builder';
import type { DefineFeature } from '../types';
import { configureBlockHandle } from './handle';
import { configureMenu, menu, menuAPI } from './menu';
import type { SlashMenuItem } from './menu/utils';

interface BlockEditConfig {
  handleAddIcon: string;
  handleDragIcon: string;
  buildMenu: (builder: GroupBuilder<SlashMenuItem>) => void;

  textGroup: {
    label: string;
    text: {
      label: string;
      icon: string;
    } | null;
    h1: {
      label: string;
      icon: string;
    } | null;
    h2: {
      label: string;
      icon: string;
    } | null;
    h3: {
      label: string;
      icon: string;
    } | null;
    h4: {
      label: string;
      icon: string;
    } | null;
    h5: {
      label: string;
      icon: string;
    } | null;
    h6: {
      label: string;
      icon: string;
    } | null;
    quote: {
      label: string;
      icon: string;
    } | null;
    divider: {
      label: string;
      icon: string;
    } | null;
  } | null;

  listGroup: {
    label: string;
    bulletList: {
      label: string;
      icon: string;
    } | null;
    orderedList: {
      label: string;
      icon: string;
    } | null;
    taskList: {
      label: string;
      icon: string;
    } | null;
  } | null;

  advancedGroup: {
    label: string;
    image: {
      label: string;
      icon: string;
    } | null;
    imageLink: {
      label: string;
      icon: string;
    } | null;
    codeBlock: {
      label: string;
      icon: string;
    } | null;
    table: {
      label: string;
      icon: string;
    } | null;
    math: {
      label: string;
      icon: string;
    } | null;
  } | null;
}

export type BlockEditFeatureConfig = DeepPartial<BlockEditConfig>;

export const defineBlockEdit: DefineFeature<BlockEditFeatureConfig> = (editor, config) => {
  editor
    .config(featureConfig(MarkdownFeature.BlockEdit))
    .config((ctx) => configureBlockHandle(ctx, config))
    .config((ctx) => configureMenu(ctx, config))
    .use(menuAPI)
    .use(block)
    .use(menu);
  return config;
};
