import { imageSchema } from '@milkdown/preset-commonmark';
import type { Node } from '@milkdown/prose/model';
import type { NodeViewConstructor } from '@milkdown/prose/view';
import { $view } from '@milkdown/utils';

import { addViewEvent, defIfNotExists, withMeta } from '../../../utils';
import { ImageMenuShowSlice } from '../image-menu';
import type { InlineImageComponentProps } from './component';
import { InlineImageElement } from './component';
import { inlineImageConfig } from './config';

defIfNotExists('milkdown-image-inline', InlineImageElement);
export const inlineImageView = $view(imageSchema.node, (ctx): NodeViewConstructor => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement('milkdown-image-inline') as HTMLElement &
      InlineImageComponentProps;
    const config = ctx.get(inlineImageConfig.key);
    const proxyDomURL = config.proxyDomURL;
    const bindAttrs = (node: Node) => {
      if (!proxyDomURL) {
        dom.src = node.attrs.src;
      } else {
        const proxiedURL = proxyDomURL(node.attrs.src);
        if (typeof proxiedURL === 'string') {
          dom.src = proxiedURL;
        } else {
          proxiedURL.then((url) => {
            dom.src = url;
          });
        }
      }
      dom.alt = node.attrs.alt;
      dom.title = node.attrs.title;
    };
    bindAttrs(initialNode);
    dom.selected = false;
    dom.setAttr = (attr, value) => {
      const pos = getPos();
      if (pos == null) return;

      view.dispatch(view.state.tr.setNodeAttribute(pos, attr, value));
    };
    dom.config = config;

    let removePointerUpEvent = addViewEvent(dom, 'pointerup', () => {
      const img = dom.querySelector('img');
      if (!img) return;
      const showMenu = ctx?.get(ImageMenuShowSlice);
      showMenu?.(dom, {
        img,
        imageUrl: dom.src,
        title: dom.alt,
        caption: dom.title,
        setImageUrl: (newImageUrl) => {
          dom.setAttr?.('src', newImageUrl);
        },
        setCaption: (newCaption) => {
          dom.setAttr?.('title', newCaption);
        },
        onUpload: async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return false;
          const url = await config?.onUpload(file);
          if (!url) return false;
          dom.setAttr?.('src', url);
          return true;
        },
      });
    });
    return {
      dom,
      update: (updatedNode) => {
        if (updatedNode.type !== initialNode.type) return false;

        bindAttrs(updatedNode);
        return true;
      },
      stopEvent: (e) => {
        if (dom.selected && e.target instanceof HTMLInputElement) return true;

        return false;
      },
      selectNode: () => {
        dom.selected = true;
      },
      deselectNode: () => {
        dom.selected = false;
      },
      destroy: () => {
        if (removePointerUpEvent) {
          removePointerUpEvent();
          removePointerUpEvent = null;
        }
        dom.remove();
      },
    };
  };
});

withMeta(inlineImageView, {
  displayName: 'NodeView<image-inline>',
  group: 'ImageInline',
});
