/* eslint-disable indent */
import { Component, c, html } from 'atomico';

import { defIfNotExists } from '../../utils';

export interface MarkdownMenuOption {
  label: string;
}

export interface MarkdownMenuProps {
  options: MarkdownMenuOption[];
  isVisible: boolean;
  onClose: () => void;
  onMenuClick: () => void;
}

const MarkdownMenuComponent: Component<MarkdownMenuProps> = ({
  options,
  isVisible,
  onClose,
  onMenuClick,
}) => {
  return html`
    <host>
      ${isVisible &&
      html`
        <div class="menu" onclick=${onClose}>
          <ul>
            ${options?.map(
              (option) => html`
                <li>
                  <button
                    onclick=${(e: Event) => {
                      e.stopPropagation();
                      onMenuClick?.();
                      onClose?.();
                    }}
                  >
                    ${option.label}
                  </button>
                </li>
              `,
            )}
          </ul>
        </div>
      `}
    </host>
  `;
};

MarkdownMenuComponent.props = {
  options: Array,
  isVisible: Boolean,
  onClose: Function,
  onMenuClick: Function,
};

export const MarkdownMenuTagName = 'milkdown-markdown-menu';
const MarkdownMenu = c(MarkdownMenuComponent);
defIfNotExists(MarkdownMenuTagName, MarkdownMenu);
