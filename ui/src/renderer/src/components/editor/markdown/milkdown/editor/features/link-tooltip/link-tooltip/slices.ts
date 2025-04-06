import type { Mark } from '@milkdown/prose/model';
import { $ctx } from '@milkdown/utils';
import { html } from 'atomico';

import { withMeta } from '../../../utils';

export interface LinkToolTipState {
  mode: 'preview' | 'edit';
}

const defaultState: LinkToolTipState = {
  mode: 'preview',
};

export const linkTooltipState = $ctx({ ...defaultState }, 'linkTooltipStateCtx');

withMeta(linkTooltipState, {
  displayName: 'State<link-tooltip>',
  group: 'LinkTooltip',
});

export interface LinkTooltipAPI {
  addLink: (from: number, to: number) => void;
  editLink: (mark: Mark, from: number, to: number) => void;
  removeLink: (from: number, to: number) => void;
}

const defaultAPI: LinkTooltipAPI = {
  addLink: () => {},
  editLink: () => {},
  removeLink: () => {},
};

export const linkTooltipAPI = $ctx({ ...defaultAPI }, 'linkTooltipAPICtx');

withMeta(linkTooltipState, {
  displayName: 'API<link-tooltip>',
  group: 'LinkTooltip',
});

export interface LinkTooltipConfig {
  linkIcon: () => ReturnType<typeof html>;
  editButton: () => ReturnType<typeof html>;
  confirmButton: () => ReturnType<typeof html>;
  removeButton: () => ReturnType<typeof html>;
  onCopyLink: ((link: string) => void) | null;
  onClickLink: ((link: string) => void) | null;
  onEditClick?: ((link: string) => Promise<string | false>) | null;
  inputPlaceholder: string;
}

const defaultConfig: LinkTooltipConfig = {
  linkIcon: () => '🔗',
  editButton: () => '✎',
  removeButton: () => '⌫',
  confirmButton: () => html`
    Confirm ⏎
  `,
  onCopyLink: null,
  onClickLink: null,
  onEditClick: null,
  inputPlaceholder: 'Paste link...',
};

export const linkTooltipConfig = $ctx(
  {
    ...defaultConfig,
  },
  'linkTooltipConfigCtx',
);

withMeta(linkTooltipState, {
  displayName: 'Config<link-tooltip>',
  group: 'LinkTooltip',
});
