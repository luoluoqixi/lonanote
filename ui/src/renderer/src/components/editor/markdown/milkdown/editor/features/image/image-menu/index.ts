import { Editor } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { TooltipProvider, tooltipFactory } from '@milkdown/kit/plugin/tooltip';
import type { EditorState, PluginView } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { AtomicoThis } from 'atomico/types/dom';

import { addViewScrollEvent } from '../../../utils';
import { ImageMenuElement, ImageMenuProps } from './component';

export interface ImageMenuConfig {}

const toolbar = tooltipFactory('CREPE_TOOLBAR');

class ImageMenuView implements PluginView {
  #tooltipProvider: TooltipProvider;
  #content: AtomicoThis<ImageMenuProps>;
  #removeOnScroll: (() => void) | null;

  constructor(ctx: Ctx, view: EditorView, config?: ImageMenuConfig) {
    const content = new ImageMenuElement();
    this.#content = content;
    this.#content.ctx = ctx;
    this.#content.hide = this.hide;
    this.#tooltipProvider = new TooltipProvider({
      content: this.#content,
      debounce: 20,
      offset: 10,
      shouldShow(view: EditorView) {
        return true;
      },
    });
    this.#tooltipProvider.onShow = () => {
      this.#content.show = true;
    };
    this.#tooltipProvider.onHide = () => {
      this.#content.show = false;
    };

    this.#update(view);

    this.#removeOnScroll = addViewScrollEvent(view, () => {
      this.#update(view);
    });
  }

  #update = (view: EditorView, prevState?: EditorState) => {
    this.#tooltipProvider.update(view, prevState);
  };

  destroy = () => {
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }
    this.#tooltipProvider.destroy();
    this.#content.remove();
  };

  hide = () => {
    this.#tooltipProvider.hide();
  };
}

export const defineImageMenu = (editor: Editor, config?: ImageMenuConfig) => {
  editor
    .config((ctx) => {
      ctx.set(toolbar.key, {
        view: (view) => new ImageMenuView(ctx, view, config),
      });
    })
    .use(toolbar);

  return config;
};
