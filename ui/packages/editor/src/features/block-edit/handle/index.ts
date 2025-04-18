import { editorViewCtx } from '@milkdown/kit/core';
import type { Ctx } from '@milkdown/kit/ctx';
import { BlockProvider, block, blockConfig } from '@milkdown/kit/plugin/block';
import { paragraphSchema } from '@milkdown/kit/preset/commonmark';
import { findParent } from '@milkdown/kit/prose';
import type { PluginView } from '@milkdown/kit/prose/state';
import { TextSelection } from '@milkdown/kit/prose/state';
import { type App, createApp } from 'vue';

import { editableCtx } from '../../../core/slice';
import { menuIcon, plusIcon } from '../../../icons';
import type { BlockEditFeatureConfig } from '../index';
import { menuAPI } from '../menu';
import { BlockHandle } from './component';

export class BlockHandleView implements PluginView {
  #content: HTMLElement;
  #provider: BlockProvider;
  #app: App;
  readonly #ctx: Ctx;

  constructor(ctx: Ctx, config?: BlockEditFeatureConfig) {
    this.#ctx = ctx;
    const content = document.createElement('div');
    content.classList.add('milkdown-block-handle');
    const app = createApp(BlockHandle, {
      onAdd: this.onAdd,
      addIcon: config?.handleAddIcon ?? (() => plusIcon),
      handleIcon: config?.handleDragIcon ?? (() => menuIcon),
    });
    app.mount(content);
    this.#app = app;
    this.#content = content;
    this.#provider = new BlockProvider({
      ctx,
      content,
      getOffset: () => 16,
      getPlacement: ({ active, blockDom }) => {
        if (active.node.type.name === 'heading') return 'left';

        let totalDescendant = 0;
        active.node.descendants((node) => {
          totalDescendant += node.childCount;
        });
        const dom = active.el;
        const domRect = dom.getBoundingClientRect();
        const handleRect = blockDom.getBoundingClientRect();
        const style = window.getComputedStyle(dom);
        const paddingTop = Number.parseInt(style.paddingTop, 10) || 0;
        const paddingBottom = Number.parseInt(style.paddingBottom, 10) || 0;
        const height = domRect.height - paddingTop - paddingBottom;
        const handleHeight = handleRect.height;
        return totalDescendant > 2 || handleHeight < height ? 'left-start' : 'left';
      },
    });

    // ==== 修改 ====
    // 切换readOnly时隐藏block-handle
    ctx.use(editableCtx).on((editable) => {
      if (!editable) {
        const blockHandle = document.querySelector('.milkdown-block-handle');
        if (blockHandle) {
          blockHandle.setAttribute('data-show', 'false');
        }
      }
    });

    this.update();
  }

  update = () => {
    this.#provider.update();
  };

  destroy = () => {
    this.#provider.destroy();
    this.#content.remove();
    this.#app.unmount();
  };

  onAdd = () => {
    const ctx = this.#ctx;
    const view = ctx.get(editorViewCtx);
    if (!view.hasFocus()) view.focus();

    const { state, dispatch } = view;
    const active = this.#provider.active;
    if (!active) return;

    const $pos = active.$pos;
    const pos = $pos.pos + active.node.nodeSize;
    let tr = state.tr.insert(pos, paragraphSchema.type(ctx).create());
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
    dispatch(tr.scrollIntoView());

    this.#provider.hide();
    ctx.get(menuAPI.key).show(tr.selection.from);
  };
}

export function configureBlockHandle(ctx: Ctx, config?: BlockEditFeatureConfig) {
  ctx.set(blockConfig.key, {
    filterNodes: (pos) => {
      const filter = findParent((node) =>
        ['table', 'blockquote', 'math_inline'].includes(node.type.name),
      )(pos);
      if (filter) return false;

      return true;
    },
  });
  ctx.set(block.key, {
    view: () => new BlockHandleView(ctx, config),
  });
}
