import type { Ctx, Slice } from '@milkdown/ctx';
import { TooltipProvider } from '@milkdown/plugin-tooltip';
import { linkSchema } from '@milkdown/preset-commonmark';
import { posToDOMRect } from '@milkdown/prose';
import type { Mark } from '@milkdown/prose/model';
import type { PluginView } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import { type App, type Ref, createApp, ref } from 'vue';

import { addViewScrollEvent } from '../../../../utils';
import type { LinkToolTipState, LinkTooltipConfig } from '../slices';
import { linkTooltipAPI, linkTooltipConfig, linkTooltipState } from '../slices';
import { PreviewLink } from './component';

export class LinkPreviewTooltip implements PluginView {
  #content: HTMLElement;
  #provider: TooltipProvider;
  #slice: Slice<LinkToolTipState>;
  #config: Ref<LinkTooltipConfig>;
  #src = ref('');
  #onEdit = ref(() => {});
  #onRemove = ref(() => {});
  #app: App;

  #hovering = false;

  // ==== 修改 ====
  observer: MutationObserver | null = null;
  #removeOnScroll: (() => void) | null;
  #isShow: boolean = false;
  #showPos: { from: number; to: number } | null = null;

  constructor(
    readonly ctx: Ctx,
    view: EditorView,
  ) {
    this.#config = ref(this.ctx.get(linkTooltipConfig.key));
    this.#app = createApp(PreviewLink, {
      config: this.#config,
      src: this.#src,
      onEdit: this.#onEdit,
      onRemove: this.#onRemove,
    });
    this.#content = document.createElement('div');
    this.#content.className = 'milkdown-link-preview';
    this.#app.mount(this.#content);

    this.#provider = new TooltipProvider({
      debounce: 0,
      content: this.#content,
      shouldShow: () => false,
    });
    this.#provider.update(view);
    this.#slice = ctx.use(linkTooltipState.key);
    this.#slice.on(this.#onStateChange);

    // ==== 修改 ====
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
    this.#config.value = this.ctx.get(linkTooltipConfig.key);
    this.#src.value = mark.attrs.href;
    const config = this.#config.value;
    this.#onEdit.value = async () => {
      if (config?.onEditClick) {
        const href = await config?.onEditClick(mark.attrs.href);
        if (href == null || typeof href === 'boolean') {
          return;
        }
        if (href !== mark.attrs.href) {
          const type = linkSchema.type(this.ctx);
          const tr = view.state.tr;
          if (mark) tr.removeMark(from, to, mark);
          tr.addMark(from, to, type.create({ href }));
          view.dispatch(tr);
        }
        return;
      }
      this.ctx.get(linkTooltipAPI.key).editLink(mark, from, to);
    };
    this.#onRemove.value = () => {
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

  // ==== 修改 ====
  updatePos = (view: EditorView) => {
    if (!this.#isShow || !this.#showPos) return;
    const { from, to } = this.#showPos;
    this.#provider.show({
      getBoundingClientRect: () => posToDOMRect(view, from, to),
    });
  };

  destroy = () => {
    // ==== 修改 ====
    this.#isShow = false;
    this.#showPos = null;
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }

    this.#app.unmount();
    this.#slice.off(this.#onStateChange);
    this.#provider.destroy();
    this.#content.remove();
  };
}
