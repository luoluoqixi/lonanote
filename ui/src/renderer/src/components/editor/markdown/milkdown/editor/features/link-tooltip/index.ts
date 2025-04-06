import { confirmIcon, copyIcon, editIcon, removeIcon } from '../../icons';
import type { DefineFeature, Icon } from './../types';
import { configureLinkTooltip, linkTooltipConfig, linkTooltipPlugin } from './link-tooltip';

interface LinkTooltipConfig {
  linkIcon?: Icon;
  editButton?: Icon;
  removeButton?: Icon;
  confirmButton?: Icon;
  inputPlaceholder?: string;
  onCopyLink?: (link: string) => void;
  onClickLink?: (link: string) => void;
  onEditClick?: (link: string) => Promise<string | false>;
}

export type LinkTooltipFeatureConfig = Partial<LinkTooltipConfig>;

export const defineLinkTooltip: DefineFeature<LinkTooltipFeatureConfig> = (editor, config) => {
  editor
    .config(configureLinkTooltip)
    .config((ctx) => {
      ctx.update(linkTooltipConfig.key, (prev) => ({
        ...prev,
        linkIcon: config?.linkIcon ?? (() => copyIcon),
        editButton: config?.editButton ?? (() => editIcon),
        removeButton: config?.removeButton ?? (() => removeIcon),
        confirmButton: config?.confirmButton ?? (() => confirmIcon),
        inputPlaceholder: config?.inputPlaceholder ?? 'Paste link...',
        onCopyLink: config?.onCopyLink ?? (() => {}),
        onClickLink: config?.onClickLink ?? null,
        onEditClick: config?.onEditClick ?? null,
      }));
    })
    .use(linkTooltipPlugin);
  return config;
};
