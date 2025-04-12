import { Ctx } from '@milkdown/kit/ctx';
import { Component, c, html, useEffect, useState } from 'atomico';

import { MarkdownMenuOption, MarkdownMenuTagName } from '../../../components';
import { defIfNotExists } from '../../../utils';

export interface ImageMenuProps {
  ctx: Ctx;
  hide: () => void;
  show: boolean;
  onMenuClick: () => void;
}

const ImageMenuComponent: Component<ImageMenuProps> = ({ show, hide, onMenuClick }) => {
  const [options, setOptions] = useState<MarkdownMenuOption[] | null>(null);
  useEffect(() => {
    setOptions([
      {
        label: '123',
      },
      {
        label: '456',
      },
      {
        label: '789',
      },
    ]);
  }, []);
  return html`
    <host>
      <${MarkdownMenuTagName}
        options=${options}
        isVisible=${show}
        onClose=${hide}
        onClickMenu=${onMenuClick}
      />
    </host>
  `;
};

ImageMenuComponent.props = {
  ctx: Object,
  show: Boolean,
  hide: Function,
  onMenuClick: Function,
};

export const ImageMenuTagName = 'milkdown-image-menu';
export const ImageMenuElement = c(ImageMenuComponent);
defIfNotExists(ImageMenuTagName, ImageMenuElement);
