import type { Mark } from '@milkdown/prose/model';
import { $ctx } from '@milkdown/utils';

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
  linkIcon: string;
  editButton: string;
  confirmButton: string;
  removeButton: string;
  onCopyLink: (link: string) => void;
  inputPlaceholder: string;

  // ==== 修改 ====
  hoverShow: boolean | null;
  selectionShow: boolean | null;
  onClickLink: ((link: string) => void) | null;
  onEditClick?: ((link: string) => Promise<string | false>) | null;
}

const defaultConfig: LinkTooltipConfig = {
  linkIcon: '🔗',
  editButton: '✎',
  removeButton: '⌫',
  confirmButton: 'Confirm ⏎',
  onCopyLink: () => {},
  inputPlaceholder: 'Paste link...',

  // ==== 修改 ====
  onClickLink: null,
  onEditClick: null,
  hoverShow: null,
  selectionShow: null,
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
