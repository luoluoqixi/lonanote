import type { Mark, MarkType, Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';

import { getNodeMark } from './checker';

export function findMarkPosition(
  mark: Mark,
  node: ProseNode,
  doc: ProseNode,
  from: number,
  to: number,
) {
  let markPos = { start: -1, end: -1 };
  doc.nodesBetween(from, to, (n, pos) => {
    // stop recursive finding if result is found
    if (markPos.start > -1) return false;

    if (markPos.start === -1 && mark.isInSet(n.marks) && node === n) {
      markPos = {
        start: pos,
        end: pos + Math.max(n.textContent.length, 1),
      };
    }

    return undefined;
  });

  return markPos;
}

export function shouldShowWhenHover(
  view: EditorView,
  event: MouseEvent,
  type: MarkType | ((mark: Mark) => boolean),
) {
  const $pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!$pos) return;

  const { pos } = $pos;
  let node = view.state.doc.nodeAt(pos);
  node = isInHoverArea(pos, node, view, event, type);
  if (!node) return;

  const mark = getNodeMark(node, type);
  if (!mark) return;
  return { show: true, pos, node, mark };
}

function isInHoverArea(
  pos: number,
  node: ProseNode | null,
  view: EditorView,
  event: MouseEvent,
  type: MarkType | ((mark: Mark) => boolean),
): ProseNode | null {
  const isLink = typeof type !== 'function' && type.name === 'link';
  if (isLink) {
    const dom = document.elementFromPoint(event.clientX, event.clientY);
    const imgInlineDom = findClosestElement(dom, '.milkdown-image-inline');
    let imgDom: HTMLImageElement | null = null;
    if (imgInlineDom) {
      imgDom = imgInlineDom.querySelector('img');
      if (imgDom) {
        const pos = view.posAtDOM(imgInlineDom, 0);
        const n = view.state.doc.nodeAt(pos);
        if (n && node !== n) {
          node = n;
        }
      }
    }
    if (node && node.isAtom && node.isInline) {
      if (imgDom) {
        const rect = imgDom.getBoundingClientRect();
        if (isPointInsideRect(event, rect)) {
          return node;
        }
        return null;
      }
      // 计算这个 pos 的实际屏幕坐标
      const coords = view.coordsAtPos(pos);
      const dx = event.clientX - coords.left;
      const dy = event.clientY - coords.top;
      const distance = Math.hypot(dx, dy);
      // 超过一定距离就认为是“伪命中”，忽略
      if (distance < 20) {
        return node;
      }
      return null;
    }
  }
  return node;
}

function isPointInsideRect(event: MouseEvent, rect: DOMRect): boolean {
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function findClosestElement(dom: Node | null, className: string): HTMLElement | null {
  if (!dom) return null;
  // if (dom.nodeType === Node.TEXT_NODE) {
  //   const upperName = tagName.toUpperCase();
  //   while (dom) {
  //     if (dom instanceof HTMLElement && dom.tagName === upperName) {
  //       return dom;
  //     }
  //     dom = dom.parentNode;
  //   }
  //   return null;
  // }
  if (dom instanceof HTMLElement) {
    return dom.closest(className);
  }
  return null;
}
