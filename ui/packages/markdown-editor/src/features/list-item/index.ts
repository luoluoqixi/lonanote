import {
  listItemBlockComponent,
  listItemBlockConfig,
} from '@milkdown/kit/component/list-item-block';
import type { Ctx } from '@milkdown/kit/ctx';

import { MarkdownFeature } from '..';
import { featureConfig } from '../../core/slice';
import { bulletIcon, checkBoxCheckedIcon, checkBoxUncheckedIcon } from '../../icons';
import type { DefineFeature } from '../types';

export interface ListItemConfig {
  bulletIcon: string;
  checkBoxCheckedIcon: string;
  checkBoxUncheckedIcon: string;
}

export type ListItemFeatureConfig = Partial<ListItemConfig>;

function configureListItem(ctx: Ctx, config?: ListItemFeatureConfig) {
  ctx.set(listItemBlockConfig.key, {
    renderLabel: ({ label, listType, checked }) => {
      if (checked == null) {
        if (listType === 'bullet') return config?.bulletIcon ?? bulletIcon;

        return label;
      }

      if (checked) return config?.checkBoxCheckedIcon ?? checkBoxCheckedIcon;

      return config?.checkBoxUncheckedIcon ?? checkBoxUncheckedIcon;
    },
  });
}

export const defineListItem: DefineFeature<ListItemFeatureConfig> = (editor, config) => {
  editor
    .config(featureConfig(MarkdownFeature.ListItem))
    .config((ctx) => configureListItem(ctx, config))
    .use(listItemBlockComponent);
  return config;
};
