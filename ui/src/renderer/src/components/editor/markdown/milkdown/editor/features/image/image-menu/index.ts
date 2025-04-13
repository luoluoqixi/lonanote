import { ClientRectObject } from '@floating-ui/dom';
import { Editor } from '@milkdown/kit/core';
import { type Ctx, createSlice } from '@milkdown/kit/ctx';
import { TooltipProvider, tooltipFactory } from '@milkdown/kit/plugin/tooltip';
import type { PluginView } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { AtomicoThis } from 'atomico/types/dom';
import throttle from 'lodash.throttle';

import { MarkdownMenu, MarkdownMenuOption, MarkdownMenuProps } from '../../../components';
import { captionIcon, downloadIcon, imageIcon, previewIcon } from '../../../icons';
import { addViewScrollEvent } from '../../../utils';

export type ImageMenuItem = MarkdownMenuOption;
export type ImageMenuItemConfig = Partial<ImageMenuItem> & {
  disable?: boolean;
};

export type ImageMenuClick = (
  option: MarkdownMenuOption,
  index: number,
  ctx: Ctx,
  handles: ImageHandles | null,
) => boolean;

export interface ImageMenuConfig {
  title: string;
  customOptions?: ImageMenuItem[];
  previewItem?: ImageMenuItemConfig;
  uploadImageItem?: ImageMenuItemConfig;
  editImageItem?: ImageMenuItemConfig;
  editCaptionItem?: ImageMenuItemConfig;
  downloadImageItem?: ImageMenuItemConfig;

  onMenuClick?: ImageMenuClick;
}

const toolbar = tooltipFactory('CREPE_TOOLBAR');

const options: ImageMenuItem[] = [
  {
    key: 'preview',
    label: 'Preview',
    icon: previewIcon,
  },
  {
    key: 'upload-image',
    label: 'Upload Image',
    icon: imageIcon,
  },
  {
    key: 'edit-image',
    label: 'Edit Image',
    icon: imageIcon,
  },
  {
    key: 'edit-caption',
    label: 'Edit Caption',
    icon: captionIcon,
  },
  {
    key: 'download-image',
    label: 'Download',
    icon: downloadIcon,
  },
];

const addMergeOption = (
  options: ImageMenuItem[],
  config: ImageMenuItemConfig | undefined,
  option: ImageMenuItem,
) => {
  if (config) {
    if (config.disable) {
      return;
    }
    options.push({
      ...option,
      ...config,
    });
  }
  options.push(option);
};

const getOptions = (config?: ImageMenuConfig): ImageMenuItem[] => {
  if (!config) return options;
  const newOptions: ImageMenuItem[] = [];
  addMergeOption(newOptions, config.previewItem, options[0]);
  addMergeOption(newOptions, config.uploadImageItem, options[1]);
  addMergeOption(newOptions, config.editImageItem, options[2]);
  addMergeOption(newOptions, config.editCaptionItem, options[3]);
  addMergeOption(newOptions, config.downloadImageItem, options[4]);
  if (config.customOptions) {
    for (let i = 0; i < config.customOptions.length; i++) {
      const option = config.customOptions[i];
      if (option) {
        newOptions.push(option);
      }
    }
  }
  return newOptions;
};

export interface VirtualElement {
  getBoundingClientRect(): ClientRectObject;
}

export interface ImageHandles {}

class ImageMenuView implements PluginView {
  #tooltipProvider: TooltipProvider;
  #content: AtomicoThis<MarkdownMenuProps>;
  #removeOnScroll: (() => void) | null;
  #show: boolean;
  #virtualElement?: VirtualElement | null;
  #initialized?: boolean;
  #root: HTMLElement;
  #customMenuClick?: ImageMenuClick;
  #menuHandles: ImageHandles | null;

  constructor(ctx: Ctx, view: EditorView, config?: ImageMenuConfig) {
    const content = new MarkdownMenu();
    this.#content = content;
    this.#content.ctx = ctx;
    this.#content.hide = this.hide;
    this.#content.options = getOptions(config);
    this.#content.title = config?.title || 'image handle';
    this.#content.onMenuClick = this.#onMenuClick;
    this.#customMenuClick = config?.onMenuClick;
    this.#show = false;
    this.#virtualElement = null;
    this.#initialized = false;
    this.#root = view.dom.parentElement ?? document.body;
    this.#menuHandles = null;

    this.#tooltipProvider = new TooltipProvider({
      content: this.#content,
      debounce: 20,
      offset: 10,
      shouldShow: () => {
        return this.#show;
      },
      floatingUIOptions: {
        placement: 'bottom',
      },
    });
    this.#tooltipProvider.onShow = () => {
      if (!this.#content.show) {
        this.#content.show = true;
      }
    };
    this.#tooltipProvider.onHide = () => {
      if (this.#content.show) {
        this.#content.show = false;
      }
    };

    this.#removeOnScroll = addViewScrollEvent(view, () => {
      this.#update();
    });

    document.addEventListener('pointerdown', this.#onDocumentDown);

    ctx.set(ImageMenuToggleSlice, (e, h) => {
      this.toggle(e, h);
    });
    ctx.set(ImageMenuShowSlice, (e, h) => {
      this.show(e, h);
    });
    ctx.set(ImageMenuHideSlice, () => {
      this.hide();
    });
    ctx.set(ImageMenuIsShowSlice, () => this.#show);
  }

  #update = () => {
    if (this.#virtualElement) {
      if (!this.#initialized) {
        const root = this.#root;
        root.appendChild(this.#content);
        this.#initialized = true;
      }
      const updater = throttle(() => {
        if (this.#virtualElement) {
          this.#tooltipProvider.show(this.#virtualElement);
        }
        requestAnimationFrame(() => {
          if (this.#virtualElement) {
            this.#tooltipProvider.show(this.#virtualElement);
          }
        });
      }, 200);
      updater();
    }
  };

  destroy = () => {
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }
    document.removeEventListener('pointerdown', this.#onDocumentDown);
    this.#tooltipProvider.destroy();
    this.#content.remove();
  };

  hide = () => {
    this.#show = false;
    this.#virtualElement = null;
    this.#menuHandles = null;
    this.#tooltipProvider.hide();
  };

  show = (virtualElement: VirtualElement | null, handles: ImageHandles | null) => {
    this.#menuHandles = handles;
    this.#virtualElement = virtualElement;
    this.#show = true;
    this.#update();
  };

  toggle = (virtualElement: VirtualElement | null, handles: ImageHandles | null) => {
    if (!this.#show) {
      this.show(virtualElement, handles);
    } else {
      this.hide();
    }
  };

  #onMenuClick = (option: MarkdownMenuOption, index: number, ctx: Ctx) => {
    if (this.#customMenuClick) {
      const handleFinish = this.#customMenuClick(option, index, ctx, this.#menuHandles);
      if (handleFinish) {
        return;
      }
    }
    console.log(index, this.#menuHandles);
    // if (this.#menuHandles) {
    //   console.log(index, this.#menuHandles);
    // }
  };

  #onDocumentDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!this.#content.contains?.(target)) {
      this.hide();
    }
  };
}

export type ImageMenuShowFun =
  | ((virtualElement: VirtualElement | null, handles: ImageHandles | null) => void)
  | null;
export type ImageMenuVoidFun =
  | ((virtualElement: VirtualElement | null, handles: ImageHandles | null) => void)
  | null;
export type ImageMenuBooleanFun = (() => boolean) | null;

export const ImageMenuToggleSlice = createSlice<ImageMenuShowFun>(null, 'image-menu-toggle');
export const ImageMenuShowSlice = createSlice<ImageMenuShowFun>(null, 'image-menu-show');
export const ImageMenuHideSlice = createSlice<ImageMenuVoidFun>(null, 'image-menu-hide');
export const ImageMenuIsShowSlice = createSlice<ImageMenuBooleanFun>(null, 'image-menu-isshow');

export const defineImageMenu = (editor: Editor, config?: ImageMenuConfig) => {
  editor
    .config((ctx) => {
      ctx.inject(ImageMenuToggleSlice, null);
      ctx.inject(ImageMenuShowSlice, null);
      ctx.inject(ImageMenuHideSlice, null);
      ctx.inject(ImageMenuIsShowSlice, null);
      ctx.set(toolbar.key, {
        view: (view) => new ImageMenuView(ctx, view, config),
      });
    })
    .use(toolbar);

  return config;
};
