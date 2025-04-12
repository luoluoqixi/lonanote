import type { Component } from 'atomico';
import { c, html, useRef, useState } from 'atomico';
import clsx from 'clsx';
import { customAlphabet } from 'nanoid';

import type { ImageBlockConfig } from '../config';
import { IMAGE_DATA_TYPE } from '../schema';
import { useBlockEffect } from './event';

export interface Attrs {
  src: string;
  caption: string;
  ratio: number;
}

export type ImageComponentProps = Attrs & {
  config: ImageBlockConfig;
  selected: boolean;
  readonly: boolean;
  setAttr: <T extends keyof Attrs>(attr: T, value: Attrs[T]) => void;
};

const nanoid = customAlphabet('abcdefg', 8);

export const imageComponent: Component<ImageComponentProps> = ({
  src = '',
  caption = '',
  ratio = 1,
  selected = false,
  readonly = false,
  setAttr,
  config,
}) => {
  const image = useRef<HTMLImageElement>();
  const resizeHandle = useRef<HTMLDivElement>();
  const linkInput = useRef<HTMLInputElement>();
  const [hidePlaceholder, setHidePlaceholder] = useState(src.length !== 0);
  const [uuid] = useState(nanoid());
  const [focusLinkInput, setFocusLinkInput] = useState(false);
  const [currentLink, setCurrentLink] = useState(src);
  const [showOperation, setShowOperation] = useState(false);

  useBlockEffect({
    image,
    resizeHandle,
    ratio,
    setRatio: (r) => setAttr?.('ratio', r),
    src,
    readonly,
  });

  const onEditLink = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    setHidePlaceholder(value.length !== 0);
    setCurrentLink(value);
  };

  const onUpload = async (e: InputEvent) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const url = await config?.onUpload(file);
    if (!url) return;

    setAttr?.('src', url);
    setHidePlaceholder(true);
  };

  const onMouseEnter = () => {
    if (readonly) return;
    setShowOperation(true);
  };
  const onMouseLeave = () => {
    setShowOperation(false);
  };

  // const onInput = (e: InputEvent) => {
  //   const target = e.target as HTMLInputElement;
  //   const value = target.value;
  //   setAttr?.('caption', value);
  // };

  const onConfirmLinkInput = () => {
    setAttr?.('src', linkInput.current?.value ?? '');
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onConfirmLinkInput();
  };

  const preventDrag = (e: Event) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const operationClick = (e: Event) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return html`
    <host class=${clsx(selected && 'selected')}>
      <div class=${clsx('image-edit', src.length > 0 && 'hidden')}>
        <div class="image-icon">${config?.imageIcon()}</div>
        <div class=${clsx('link-importer', focusLinkInput && 'focus')}>
          <input
            ref=${linkInput}
            draggable="true"
            ondragstart=${preventDrag}
            disabled=${readonly}
            class="link-input-area"
            value=${currentLink}
            oninput=${onEditLink}
            onkeydown=${onKeydown}
            onfocus=${() => setFocusLinkInput(true)}
            onblur=${() => setFocusLinkInput(false)}
          />
          <div class=${clsx('placeholder', hidePlaceholder && 'hidden')}>
            <input
              disabled=${readonly}
              class="hidden"
              id=${uuid}
              type="file"
              accept="image/*"
              onchange=${onUpload}
            />
            <label class="uploader" for=${uuid}>${config?.uploadButton()}</label>
            <span class="text" onclick=${() => linkInput.current?.focus()}>
              ${config?.uploadPlaceholderText}
            </span>
          </div>
        </div>
        <div
          class=${clsx('confirm', currentLink.length === 0 && 'hidden')}
          onclick=${() => onConfirmLinkInput()}
        >
          ${config?.confirmButton()}
        </div>
      </div>
      <div
        class=${clsx('image-wrapper', src.length === 0 && 'hidden')}
        onmouseenter=${onMouseEnter}
        onmouseleave=${onMouseLeave}
      >
        <div class=${clsx('image-block-title', selected && 'visible')}>${caption}</div>
        <div class=${clsx('operation', showOperation && 'visible')}>
          <div class="operation-item" onpointerdown=${operationClick}>
            ${config?.operationIcon()}
          </div>
        </div>
        <img ref=${image} data-type=${IMAGE_DATA_TYPE} src=${src} alt=${caption} ratio=${ratio} />
        <div ref=${resizeHandle} class=${clsx('image-resize-handle', showOperation && 'visible')}>
          ${config?.resizeIcon()}
        </div>
      </div>
    </host>
  `;
};

imageComponent.props = {
  src: String,
  caption: String,
  ratio: Number,
  selected: Boolean,
  readonly: Boolean,
  setAttr: Function,
  config: Object,
};

export const ImageElement = c(imageComponent);
