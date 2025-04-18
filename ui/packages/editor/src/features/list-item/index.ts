import {
  listItemBlockComponent,
  listItemBlockConfig,
} from '@milkdown/kit/component/list-item-block';
import type { Ctx } from '@milkdown/kit/ctx';
import { html } from 'atomico';
import clsx from 'clsx';

import { bulletIcon, checkBoxCheckedIcon, checkBoxUncheckedIcon } from '../../icons';
import type { DefineFeature, Icon } from './../types';

interface ListItemConfig {
  bulletIcon: Icon;
  checkBoxCheckedIcon: Icon;
  checkBoxUncheckedIcon: Icon;
}

export type ListItemFeatureConfig = Partial<ListItemConfig>;

function configureListItem(ctx: Ctx, config?: ListItemFeatureConfig) {
  ctx.set(listItemBlockConfig.key, {
    renderLabel: ({ label, listType, checked, readonly }) => {
      if (checked == null) {
        if (listType === 'bullet')
          return html`
            <span class="label">${config?.bulletIcon?.() ?? bulletIcon}</span>
          `;

        return html`
          <span class="label">${label}</span>
        `;
      }

      if (checked)
        return html`
          <span class=${clsx('label checkbox', readonly && 'readonly')}>
            ${config?.checkBoxCheckedIcon?.() ?? checkBoxCheckedIcon}
          </span>
        `;

      return html`
        <span class=${clsx('label checkbox', readonly && 'readonly')}>
          ${config?.checkBoxUncheckedIcon?.() ?? checkBoxUncheckedIcon}
        </span>
      `;
    },
  });
}

export const defineListItem: DefineFeature<ListItemFeatureConfig> = (editor, config) => {
  editor.config((ctx) => configureListItem(ctx, config)).use(listItemBlockComponent);
  return config;
};
