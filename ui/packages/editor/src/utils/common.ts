import type { Meta, MilkdownPlugin } from '@milkdown/ctx';
import { EditorView } from '@milkdown/kit/prose/view';

export function defIfNotExists(tagName: string, element: CustomElementConstructor) {
  const current = customElements.get(tagName);
  if (current == null) {
    customElements.define(tagName, element);
    return;
  }
  if (current === element) return;
  console.warn(`Custom element ${tagName} has been defined before.`);
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

export function addViewScrollEvent(view: EditorView, onScroll: (e: Event) => void) {
  if (view.dom.parentElement) {
    return addViewEvent(view.dom.parentElement, 'scroll', onScroll);
  }
  return null;
}

export function addViewEvent<K extends keyof HTMLElementEventMap>(
  dom: HTMLElement | Window | null,
  type: K,
  listener: (this: HTMLElement, ev: Event) => any,
) {
  if (dom) {
    dom.addEventListener(type, listener);
    return () => {
      if (!dom) return;
      dom?.removeEventListener(type, listener);
    };
  }
  return null;
}
