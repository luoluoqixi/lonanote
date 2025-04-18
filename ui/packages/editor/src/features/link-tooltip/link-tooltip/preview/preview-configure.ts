import type { Ctx } from '@milkdown/ctx';
import type { Mark, Node } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
// import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';

import {
  findMarkPosition,
  getCursorNodeInType,
  getLinkMarkType,
  shouldShowWhenHover,
} from '../../../../utils';
import { linkTooltipConfig, linkTooltipState } from '../slices';
import { linkPreviewTooltip } from '../tooltips';
import { LinkPreviewTooltip } from './preview-view';

const showPreviewTooltip = (
  linkPreviewTooltipView: LinkPreviewTooltip,
  view: EditorView,
  pos: number,
  mark: Mark,
  node: Node,
) => {
  const position = view.state.doc.resolve(pos);
  const markPosition = findMarkPosition(
    mark,
    node,
    view.state.doc,
    position.before(),
    position.after(),
  );
  const from = markPosition.start;
  const to = markPosition.end;
  linkPreviewTooltipView.show(view, mark, from, to);
};

export function configureLinkPreviewTooltip(ctx: Ctx) {
  let linkPreviewTooltipView: LinkPreviewTooltip | null;
  let isCursorInsideLink = false;
  let isMouseInsideLink = false;

  const resetState = () => {
    isMouseInsideLink = false;
    isCursorInsideLink = false;
  };

  const DELAY = 300;
  const onMouseMove = throttle((view: EditorView, event: MouseEvent) => {
    if (!linkPreviewTooltipView) return;
    // if (!view.hasFocus()) return;
    if (view.isDestroyed) return;
    const config = ctx.get(linkTooltipConfig.key);
    if (config.hoverShow === false) {
      return;
    }
    if (isCursorInsideLink) return;
    const state = ctx.get(linkTooltipState.key);
    if (!view.editable || state.mode === 'edit') {
      resetState();
      linkPreviewTooltipView?.hide();
      return;
    }

    // ==== 修改 ====
    const result = shouldShowWhenHover(view, event, getLinkMarkType(ctx));
    if (result) {
      // const $pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
      // console.log(document.elementFromPoint(event.clientX, event.clientY));
      // console.log($pos, result.node);
      isMouseInsideLink = true;
      showPreviewTooltip(linkPreviewTooltipView, view, result.pos, result.mark, result.node);
      return;
    }
    isMouseInsideLink = false;
    linkPreviewTooltipView.hide();
  }, DELAY);

  const onMouseLeave = () => {
    setTimeout(() => {
      if (!isCursorInsideLink) {
        linkPreviewTooltipView?.hide();
      }
    }, DELAY);
  };

  // ==== 修改 ====
  const onSelectionChange = (view: EditorView) => {
    if (!linkPreviewTooltipView) return;
    if (view.isDestroyed) return;
    const config = ctx.get(linkTooltipConfig.key);
    if (config.selectionShow === false) {
      return;
    }
    const state = ctx.get(linkTooltipState.key);
    if (!view.editable || state.mode === 'edit') {
      resetState();
      linkPreviewTooltipView?.hide();
      return;
    }
    const node = getCursorNodeInType(view, getLinkMarkType(ctx));
    isCursorInsideLink = node !== null;
    if (isCursorInsideLink) {
      const { state } = view;
      const fromPos = state.selection.from;
      const mark = node?.marks.find((mark) => mark.type.name === 'link');
      if (mark && node) {
        showPreviewTooltip(linkPreviewTooltipView, view, fromPos, mark, node);
      }
    } else {
      if (!isMouseInsideLink) {
        linkPreviewTooltipView.hide();
      }
    }
  };

  ctx.set(linkPreviewTooltip.key, {
    props: {
      handleDOMEvents: {
        mousemove: onMouseMove,
        mouseleave: onMouseLeave,
      },
      // ==== 修改 ====
      handleClick: (view) => {
        setTimeout(() => onSelectionChange(view), 0);
      },
    },
    view: (view) => {
      linkPreviewTooltipView = new LinkPreviewTooltip(ctx, view);
      // ==== 修改 ====
      const observer = new MutationObserver(() => {
        onSelectionChange(view);
      });
      observer.observe(view.dom, { attributes: true, childList: true, subtree: true });
      linkPreviewTooltipView.observer = observer;
      return linkPreviewTooltipView;
    },

    // ==== 修改 ====
    destroy: () => {
      if (linkPreviewTooltipView && linkPreviewTooltipView.observer) {
        linkPreviewTooltipView.observer.disconnect();
      }
    },
  });
}
