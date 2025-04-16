import { ClientRectObject } from '@floating-ui/dom';
import { Editor } from '@milkdown/kit/core';
import { type Ctx, createSlice } from '@milkdown/kit/ctx';
import { TooltipProvider, tooltipFactory } from '@milkdown/kit/plugin/tooltip';
import type { PluginView } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { AtomicoThis } from 'atomico/types/dom';
import throttle from 'lodash.throttle';
import Viewer from 'viewerjs';

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
  info: ImageInfo | null,
) => boolean;

export interface ImageMenuConfig {
  title?: string;
  customOptions?: ImageMenuItem[];
  defaultMenuOptions?: Partial<Record<ImageMenuKey, ImageMenuItemConfig>>;
  onMenuClick?: ImageMenuClick;
}

const toolbar = tooltipFactory('CREPE_TOOLBAR');

export enum ImageMenuKey {
  Preview = 'preview',
  UploadImage = 'uploadImage',
  EditImage = 'editImage',
  EditCaption = 'editCaption',
  DownloadImage = 'downloadImage',
}

const options: ImageMenuItem[] = [
  {
    key: ImageMenuKey.Preview,
    label: 'Preview',
    icon: previewIcon,
  },
  {
    key: ImageMenuKey.UploadImage,
    label: 'Upload Image',
    icon: imageIcon,
  },
  {
    key: ImageMenuKey.EditImage,
    label: 'Edit Image',
    icon: imageIcon,
  },
  {
    key: ImageMenuKey.EditCaption,
    label: 'Edit Caption',
    icon: captionIcon,
  },
  {
    key: ImageMenuKey.DownloadImage,
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
    return;
  }
  options.push(option);
};

const getOptions = (config?: ImageMenuConfig): ImageMenuItem[] => {
  if (!config) return options;
  const newOptions: ImageMenuItem[] = [];
  for (let i = 0; i < options.length; i++) {
    const item = options[i];
    addMergeOption(newOptions, config.defaultMenuOptions?.[item.key], item);
  }
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

export interface ImageInfo {
  img: HTMLImageElement;
  imageUrl: string;
  caption?: string;
  title?: string;
  setImageUrl: (newImageUrl: string) => void;
  setCaption: (newCaption: string) => void;
  onUpload: (e: InputEvent) => Promise<boolean>;
}

class ImageMenuView implements PluginView {
  #tooltipProvider: TooltipProvider;
  #content: AtomicoThis<MarkdownMenuProps>;
  #removeOnScroll: (() => void) | null;
  #show: boolean;
  #virtualElement?: VirtualElement | null;
  #initialized?: boolean;
  #root: HTMLElement;
  #customMenuClick?: ImageMenuClick;
  #menuInfo: ImageInfo | null;
  #viewer: Viewer | null;

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
    this.#menuInfo = null;
    this.#viewer = null;

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
    if (this.#viewer) {
      this.#viewer.destroy();
      this.#viewer = null;
    }
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
    this.#menuInfo = null;
    this.#tooltipProvider.hide();
  };

  show = (virtualElement: VirtualElement | null, info: ImageInfo | null) => {
    this.#menuInfo = info;
    this.#virtualElement = virtualElement;
    this.#show = true;
    this.#update();
  };

  toggle = (virtualElement: VirtualElement | null, handles: ImageInfo | null) => {
    if (!this.#show) {
      this.show(virtualElement, handles);
    } else {
      this.hide();
    }
  };

  #showImageViewer = (imageInfo: ImageInfo) => {
    const { imageUrl, caption, title } = imageInfo;
    const imgViewerId = 'milkdown-image-viewer';
    let imgViewer = document.getElementById(imgViewerId);
    if (!imgViewer) {
      imgViewer = document.createElement('img');
      imgViewer.id = imgViewerId;
      imgViewer.style.display = 'none';
      document.body.appendChild(imgViewer);
    }
    imgViewer.setAttribute('src', imageUrl);
    imgViewer.setAttribute('alt', caption || '');
    imgViewer.setAttribute('title', title || '');
    if (this.#viewer == null) {
      // https://github.com/fengyuanchen/viewerjs/issues/648
      // 关闭 Viewer 时会有一个报错, github issue暂未解决
      this.#viewer = new Viewer(imgViewer, {
        button: false,
        navbar: false,
        loop: false,
        title: true,
        toolbar: {
          prev: false,
          next: false,
          play: false,
          flipHorizontal: true,
          flipVertical: true,
          oneToOne: true,
          reset: true,
          rotateLeft: true,
          rotateRight: true,
          zoomIn: true,
          zoomOut: true,
        },
      });
    }
    this.#viewer.show();
  };

  #uploadImage = (imageInfo: ImageInfo) => {
    if (!imageInfo) return;
    const imgUploadId = 'milkdown-input-upload-image-tool';
    let imgUpload = document.getElementById(imgUploadId);
    if (!imgUpload) {
      imgUpload = document.createElement('input');
      imgUpload.id = imgUploadId;
      imgUpload.setAttribute('type', 'file');
      imgUpload.setAttribute('accept', 'image/*');
      imgUpload.style.display = 'none';
      document.body.appendChild(imgUpload);
    }
    imgUpload.onchange = async (e) => {
      if (!imageInfo) return;
      await imageInfo.onUpload(e as InputEvent);
      imgUpload.onchange = null;
    };
    imgUpload.click();
  };

  #onMenuClick = (option: MarkdownMenuOption, index: number, ctx: Ctx) => {
    if (this.#customMenuClick) {
      const handleFinish = this.#customMenuClick(option, index, ctx, this.#menuInfo);
      if (handleFinish) {
        return;
      }
    }
    if (this.#menuInfo) {
      const key = option.key;
      if (key === ImageMenuKey.Preview) {
        this.#showImageViewer(this.#menuInfo);
      } else if (key === ImageMenuKey.EditImage) {
        console.log('edit image:', this.#menuInfo.img.src);
      } else if (key === ImageMenuKey.EditCaption) {
        console.log('edit caption:', this.#menuInfo.img.src);
      } else if (key === ImageMenuKey.UploadImage) {
        this.#uploadImage(this.#menuInfo);
      } else if (key === ImageMenuKey.DownloadImage) {
        console.log('download:', this.#menuInfo.img.src);
      }
    }
  };

  #onDocumentDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!this.#content.contains?.(target)) {
      this.hide();
    }
  };
}

export type ImageMenuShowFun =
  | ((virtualElement: VirtualElement | null, handles: ImageInfo | null) => void)
  | null;
export type ImageMenuVoidFun = (() => void) | null;
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
