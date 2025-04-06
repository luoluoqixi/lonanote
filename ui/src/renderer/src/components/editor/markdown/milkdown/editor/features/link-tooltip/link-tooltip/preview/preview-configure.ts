import type { Ctx } from '@milkdown/ctx';
import type { Mark, Node } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
// import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';

import { defIfNotExists } from '../../../../utils';
import { linkTooltipState } from '../slices';
import { linkPreviewTooltip } from '../tooltips';
import { findMarkPosition, isCursorInType, shouldShowPreviewWhenHover } from '../utils';
import { LinkPreviewElement } from './preview-component';
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

defIfNotExists('milkdown-link-preview', LinkPreviewElement);
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
    const state = ctx.get(linkTooltipState.key);
    if (!view.editable || state.mode === 'edit') {
      resetState();
      linkPreviewTooltipView?.hide();
      return;
    }

    const result = shouldShowPreviewWhenHover(ctx, view, event);

    if (result) {
      isMouseInsideLink = true;
      showPreviewTooltip(linkPreviewTooltipView, view, result.pos, result.mark, result.node);
      return;
    }
    isMouseInsideLink = false;
    if (!isCursorInsideLink) {
      linkPreviewTooltipView.hide();
    }
  }, DELAY);

  const onMouseLeave = () => {
    setTimeout(() => {
      if (!isCursorInsideLink) {
        linkPreviewTooltipView?.hide();
      }
    }, DELAY);
  };

  const onSelectionChange = (view: EditorView) => {
    if (!linkPreviewTooltipView) return;
    if (view.isDestroyed) return;
    const state = ctx.get(linkTooltipState.key);
    if (!view.editable || state.mode === 'edit') {
      resetState();
      linkPreviewTooltipView?.hide();
      return;
    }
    isCursorInsideLink = isCursorInType(view, 'link');
    if (isCursorInsideLink) {
      const { state } = view;
      const fromPos = state.selection.from;
      const node = state.doc.nodeAt(fromPos);
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
      handleClick: (view) => {
        setTimeout(() => onSelectionChange(view), 0);
      },
    },
    view: (view) => {
      linkPreviewTooltipView = new LinkPreviewTooltip(ctx, view);
      const observer = new MutationObserver(() => {
        onSelectionChange(view);
      });
      observer.observe(view.dom, { attributes: true, childList: true, subtree: true });
      linkPreviewTooltipView.observer = observer;
      return linkPreviewTooltipView;
    },
    destroy: () => {
      if (linkPreviewTooltipView && linkPreviewTooltipView.observer) {
        linkPreviewTooltipView.observer.disconnect();
      }
    },
  });
}
