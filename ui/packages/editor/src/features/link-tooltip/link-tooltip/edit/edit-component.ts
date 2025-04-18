import type { Component } from 'atomico';
import { c, html, useEffect, useRef, useState } from 'atomico';
import clsx from 'clsx';

import type { LinkTooltipConfig } from '../slices';

export interface LinkEditProps {
  config: LinkTooltipConfig;
  src: string;
  updateValue: boolean;
  onConfirm: (href: string) => void;
  onCancel: () => void;
}

export const linkEditComponent: Component<LinkEditProps> = ({
  src,
  updateValue,
  onConfirm,
  onCancel,
  config,
}) => {
  const linkInput = useRef<HTMLInputElement>();
  const [link, setLink] = useState(src);

  useEffect(() => {
    setLink(src ?? '');
  }, [src, updateValue]);

  const onConfirmEdit = () => {
    onConfirm?.(linkInput.current?.value ?? '');
  };

  const onKeydown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      onConfirm?.(linkInput.current?.value ?? '');
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      onCancel?.();
      e.preventDefault();
    }
  };

  return html`
    <host>
      <div class="link-edit">
        <input
          class="input-area"
          placeholder=${config?.inputPlaceholder}
          ref=${linkInput}
          onkeydown=${onKeydown}
          spellcheck="${false}"
          oninput=${(e: InputEvent) => setLink((e.target as HTMLInputElement).value)}
          value=${link}
        />
        <span class=${clsx('button confirm', !link && 'hidden')} onclick=${onConfirmEdit}>
          ${config?.confirmButton()}
        </span>
      </div>
    </host>
  `;
};

linkEditComponent.props = {
  config: Object,
  src: String,
  updateValue: Boolean,
  onConfirm: Function,
  onCancel: Function,
};

export const LinkEditElement = c(linkEditComponent);
