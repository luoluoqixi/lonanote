import { editorViewCtx } from '@milkdown/core';
import type { Ctx } from '@milkdown/ctx';
import { TooltipProvider } from '@milkdown/plugin-tooltip';
import { linkSchema } from '@milkdown/preset-commonmark';
import { posToDOMRect } from '@milkdown/prose';
import type { Mark } from '@milkdown/prose/model';
import type { PluginView } from '@milkdown/prose/state';
import { TextSelection } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';
import DOMPurify from 'dompurify';
import { type App, type Ref, createApp, ref } from 'vue';

import { addViewScrollEvent } from '../../../../utils';
import { type LinkTooltipConfig, linkTooltipConfig, linkTooltipState } from '../slices';
import { EditLink } from './component';

interface Data {
  from: number;
  to: number;
  mark: Mark | null;
}

const defaultData: Data = {
  from: -1,
  to: -1,
  mark: null,
};

export class LinkEditTooltip implements PluginView {
  #content: HTMLElement;
  #provider: TooltipProvider;
  #data: Data = { ...defaultData };
  #app: App;
  #config: Ref<LinkTooltipConfig>;
  #src = ref('');

  // ==== 修改 ====
  #removeOnScroll: (() => void) | null;
  #isShow: boolean = false;
  #showPos: { from: number; to: number } | null = null;

  constructor(
    readonly ctx: Ctx,
    view: EditorView,
  ) {
    this.#config = ref(this.ctx.get(linkTooltipConfig.key));

    const content = document.createElement('div');
    content.className = 'milkdown-link-edit';

    const app = createApp(EditLink, {
      config: this.#config,
      src: this.#src,
      onConfirm: this.#confirmEdit,
      onCancel: this.#reset,
    });
    app.mount(content);
    this.#app = app;

    this.#content = content;
    this.#provider = new TooltipProvider({
      content,
      debounce: 0,
      shouldShow: () => false,
    });
    this.#provider.onHide = () => {
      requestAnimationFrame(() => {
        view.dom.focus({ preventScroll: true });
      });
    };
    this.#provider.update(view);

    // ==== 修改 ====
    this.#removeOnScroll = addViewScrollEvent(view, () => {
      this.updatePos(view);
    });
  }

  #reset = () => {
    this.#isShow = false;

    this.#provider.hide();
    this.ctx.update(linkTooltipState.key, (state) => ({
      ...state,
      mode: 'preview' as const,
    }));
    this.#data = { ...defaultData };
  };

  #confirmEdit = (href: string) => {
    const view = this.ctx.get(editorViewCtx);
    const { from, to, mark } = this.#data;
    const type = linkSchema.type(this.ctx);
    const link = DOMPurify.sanitize(href);
    if (mark && mark.attrs.href === link) {
      this.#reset();
      return;
    }

    const tr = view.state.tr;
    if (mark) tr.removeMark(from, to, mark);

    tr.addMark(from, to, type.create({ href: link }));
    view.dispatch(tr);

    this.#reset();
  };

  #enterEditMode = (value: string, from: number, to: number) => {
    const config = this.ctx.get(linkTooltipConfig.key);
    this.#config.value = config;
    this.#src.value = value;
    this.ctx.update(linkTooltipState.key, (state) => ({
      ...state,
      mode: 'edit' as const,
    }));
    const view = this.ctx.get(editorViewCtx);
    // view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    this.#provider.show({
      getBoundingClientRect: () => posToDOMRect(view, from, to),
    });
    requestAnimationFrame(() => {
      this.#content.querySelector('input')?.focus();
    });

    // ==== 修改 ====
    this.#showPos = { from, to };
    this.#isShow = true;
  };

  update = (view: EditorView) => {
    const { state } = view;
    const { selection } = state;
    if (!(selection instanceof TextSelection)) return;
    const { from, to } = selection;
    if (from === this.#data.from && to === this.#data.to) return;

    this.#reset();
  };

  // ==== 修改 ====
  updatePos = (view: EditorView) => {
    if (!this.#isShow || !this.#showPos) return;
    const { from, to } = this.#showPos;
    if (this.#isShow) {
      this.#provider.show({
        getBoundingClientRect: () => posToDOMRect(view, from, to),
      });
    }
  };

  destroy = () => {
    // ==== 修改 ====
    this.#isShow = false;
    this.#showPos = null;
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }

    this.#app.unmount();
    this.#provider.destroy();
    this.#content.remove();
  };

  addLink = (from: number, to: number) => {
    this.#data = {
      from,
      to,
      mark: null,
    };
    this.#enterEditMode('', from, to);
  };

  editLink = (mark: Mark, from: number, to: number) => {
    this.#data = {
      from,
      to,
      mark,
    };
    this.#enterEditMode(mark.attrs.href, from, to);
  };

  removeLink = (from: number, to: number) => {
    const view = this.ctx.get(editorViewCtx);

    const tr = view.state.tr;
    tr.removeMark(from, to, linkSchema.type(this.ctx));
    view.dispatch(tr);

    this.#reset();
  };
}
