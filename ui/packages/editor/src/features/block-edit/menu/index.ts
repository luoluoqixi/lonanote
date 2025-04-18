import type { Ctx } from '@milkdown/kit/ctx';
import { SlashProvider, slashFactory } from '@milkdown/kit/plugin/slash';
import { type PluginView, type Selection, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { $ctx } from '@milkdown/kit/utils';
import { type App, type Ref, createApp, ref } from 'vue';

import { addViewScrollEvent, isInCodeBlock, isInList } from '../../../utils';
import type { BlockEditFeatureConfig } from '../index';
import { Menu } from './component';

export const menu = slashFactory('CREPE_MENU');

export interface MenuAPI {
  show: (pos: number) => void;
  hide: () => void;
}

export const menuAPI = $ctx(
  {
    show: () => {},
    hide: () => {},
  } as MenuAPI,
  'menuAPICtx',
);

export function configureMenu(ctx: Ctx, config?: BlockEditFeatureConfig) {
  ctx.set(menu.key, {
    view: (view) => new MenuView(ctx, view, config),
  });
}

class MenuView implements PluginView {
  readonly #content: HTMLElement;
  readonly #app: App;
  readonly #filter: Ref<string>;
  readonly #slashProvider: SlashProvider;
  #programmaticallyPos: number | null = null;

  // ==== 修改 ====
  #removeOnScroll: (() => void) | null;
  #showPos: { x: number; y: number } | null = null;
  #showElements: HTMLElement | null = null;
  #lastScrollPos: { x: number; y: number } | null = null;
  #showRef: Ref<boolean, boolean> | null;

  constructor(ctx: Ctx, view: EditorView, config?: BlockEditFeatureConfig) {
    const content = document.createElement('div');
    content.classList.add('milkdown-slash-menu');
    const show = ref(false);
    this.#showRef = show;

    const filter = ref('');
    this.#filter = filter;

    const hide = this.hide;

    const app = createApp(Menu, {
      ctx,
      config,
      show,
      filter,
      hide,
    });
    this.#app = app;
    app.mount(content);

    this.#content = content;
    // oxlint-disable-next-line ts/no-this-alias
    const self = this;
    this.#slashProvider = new SlashProvider({
      content: this.#content,
      debounce: 20,
      shouldShow(this: SlashProvider, view: EditorView) {
        if (isInCodeBlock(view.state.selection) || isInList(view.state.selection)) return false;

        const currentText = this.getContent(view, (node) =>
          ['paragraph', 'heading'].includes(node.type.name),
        );

        if (currentText == null) return false;

        if (!isSelectionAtEndOfNode(view.state.selection)) {
          return false;
        }

        const pos = self.#programmaticallyPos;

        filter.value = currentText.startsWith('/') ? currentText.slice(1) : currentText;

        if (typeof pos === 'number') {
          if (
            view.state.doc.resolve(pos).node() !==
            view.state.doc.resolve(view.state.selection.from).node()
          ) {
            self.#programmaticallyPos = null;

            return false;
          }

          return true;
        }

        if (!currentText.startsWith('/')) return false;

        return true;
      },
      offset: 10,
      // ==== 修改 ====
      floatingUIOptions: {
        middleware: [
          {
            name: 'milkdown-block-edit-middleware',
            fn: (s) => {
              this.#showElements = s.elements.floating;
              this.#showPos = {
                x: s.x,
                y: s.y,
              };
              this.#lastScrollPos = null;
              return {};
            },
          },
        ],
      },
    });

    this.#slashProvider.onShow = () => {
      show.value = true;
    };
    this.#slashProvider.onHide = () => {
      show.value = false;
    };
    this.update(view);

    ctx.set(menuAPI.key, {
      show: (pos) => this.show(pos),
      hide: () => this.hide(),
    });

    // ==== 修改 ====
    this.#removeOnScroll = addViewScrollEvent(view, (e) => {
      this.updatePos(e);
    });
  }

  update = (view: EditorView) => {
    this.#slashProvider.update(view);
  };

  show = (pos: number) => {
    this.#programmaticallyPos = pos;
    this.#filter.value = '';
    this.#slashProvider.show();
  };

  hide = () => {
    this.#programmaticallyPos = null;
    this.#slashProvider.hide();
  };

  destroy = () => {
    // ==== 修改 ====
    this.#showPos = null;
    this.#showElements = null;
    this.#lastScrollPos = null;
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }

    this.#slashProvider.destroy();
    this.#app.unmount();
    this.#content.remove();
  };

  // ==== 修改 ====
  updatePos = (e: Event) => {
    if (!this.#showRef.value || !this.#showElements || !this.#showPos) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    const scrollX = target?.scrollLeft || 0;
    const scrollY = target?.scrollTop || 0;
    if (this.#lastScrollPos == null) {
      this.#lastScrollPos = {
        x: scrollX,
        y: scrollY,
      };
      return;
    }
    const moveX = scrollX - this.#lastScrollPos.x;
    const moveY = scrollY - this.#lastScrollPos.y;
    this.#lastScrollPos.x = scrollX;
    this.#lastScrollPos.y = scrollY;
    const newX = this.#showPos.x - moveX;
    const newY = this.#showPos.y - moveY;
    this.#showElements.style.left = `${newX}px`;
    this.#showElements.style.top = `${newY}px`;
    this.#showPos = { x: newX, y: newY };
    // console.log('update', this.#showPos);
  };
}

function isSelectionAtEndOfNode(selection: Selection) {
  if (!(selection instanceof TextSelection)) return false;

  const { $head } = selection;
  const parent = $head.parent;
  const offset = $head.parentOffset;

  return offset === parent.content.size;
}
