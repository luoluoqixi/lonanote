import type { Ctx, Slice } from '@milkdown/ctx';
import { TooltipProvider } from '@milkdown/plugin-tooltip';
import { posToDOMRect } from '@milkdown/prose';
import type { Mark } from '@milkdown/prose/model';
import type { PluginView } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

import { addViewScrollEvent } from '../../../../utils';
import type { LinkToolTipState } from '../slices';
import { linkTooltipAPI, linkTooltipConfig, linkTooltipState } from '../slices';
import { LinkPreviewElement } from './preview-component';

export class LinkPreviewTooltip implements PluginView {
  #content = new LinkPreviewElement();
  #provider: TooltipProvider;
  #slice: Slice<LinkToolTipState>;
  observer: MutationObserver | null = null;

  #removeOnScroll: (() => void) | null;
  #isShow: boolean = false;
  #showPos: { from: number; to: number } | null = null;

  #hovering = false;

  constructor(
    readonly ctx: Ctx,
    view: EditorView,
  ) {
    this.#provider = new TooltipProvider({
      debounce: 0,
      content: this.#content,
      shouldShow: () => false,
    });
    this.#provider.update(view);
    this.#slice = ctx.use(linkTooltipState.key);
    this.#slice.on(this.#onStateChange);

    this.#removeOnScroll = addViewScrollEvent(view, () => {
      this.updatePos(view);
    });
  }

  #onStateChange = ({ mode }: LinkToolTipState) => {
    if (mode === 'edit') this.#hide();
  };

  #onMouseEnter = () => {
    this.#hovering = true;
  };

  #onMouseLeave = () => {
    this.#hovering = false;
  };

  #hide = () => {
    // 进入 edit 状态时, 直接 hide, 还在 hover 状态
    // 直接 remove 事件会导致 hovering 无法重置, 导致后续隐藏不掉
    // 所以这里需要手动重置一下 hovering
    this.#hovering = false;
    this.#isShow = false;
    this.#provider.hide();
    this.#provider.element.removeEventListener('mouseenter', this.#onMouseEnter);
    this.#provider.element.removeEventListener('mouseleave', this.#onMouseLeave);
  };

  show = (view: EditorView, mark: Mark, from: number, to: number) => {
    this.#content.config = this.ctx.get(linkTooltipConfig.key);
    this.#content.src = mark.attrs.href;
    this.#content.onEdit = () => {
      this.ctx.get(linkTooltipAPI.key).editLink(mark, from, to);
    };
    this.#content.onRemove = () => {
      this.ctx.get(linkTooltipAPI.key).removeLink(from, to);
      this.#hide();
    };

    const rect = posToDOMRect(view, from, to);

    this.#provider.show({
      getBoundingClientRect: () => rect,
    });
    this.#provider.element.addEventListener('mouseenter', this.#onMouseEnter);
    this.#provider.element.addEventListener('mouseleave', this.#onMouseLeave);
    this.#isShow = true;
    this.#showPos = { from, to };
  };

  hide = () => {
    if (this.#hovering) return;

    this.#hide();
  };

  update = () => {};

  updatePos = (view: EditorView) => {
    if (!this.#isShow || !this.#showPos) return;
    const { from, to } = this.#showPos;
    this.#provider.show({
      getBoundingClientRect: () => posToDOMRect(view, from, to),
    });
  };

  destroy = () => {
    this.#isShow = false;
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }
    this.#slice.off(this.#onStateChange);
    this.#provider.destroy();
    this.#content.remove();
  };
}
