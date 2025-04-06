import type { Meta, MilkdownPlugin } from '@milkdown/ctx';
import type { Selection } from '@milkdown/kit/prose/state';
import { EditorView } from '@milkdown/kit/prose/view';

export function isInCodeBlock(selection: Selection) {
  const type = selection.$from.parent.type;
  return type.name === 'code_block';
}

export function isInList(selection: Selection) {
  const type = selection.$from.node(selection.$from.depth - 1)?.type;
  return type?.name === 'list_item';
}

export function defIfNotExists(tagName: string, element: CustomElementConstructor) {
  const current = customElements.get(tagName);
  if (current == null) {
    customElements.define(tagName, element);
    return;
  }
  if (current === element) return;
  console.warn(`Custom element ${tagName} has been defined before.`);
}

export function addViewScrollEvent(view: EditorView, onScroll: (e: Event) => void) {
  if (view.dom.parentElement) {
    view.dom.parentElement.addEventListener('scroll', onScroll);
    return () => {
      if (!view || !view.dom || !view.dom.parentElement) return;
      view.dom.parentElement?.removeEventListener('scroll', onScroll);
    };
  }
  return null;
}

export function withMeta<T extends MilkdownPlugin>(
  plugin: T,
  meta: Partial<Meta> & Pick<Meta, 'displayName'>,
): T {
  Object.assign(plugin, {
    meta: {
      package: '@milkdown/components',
      ...meta,
    },
  });

  return plugin;
}
