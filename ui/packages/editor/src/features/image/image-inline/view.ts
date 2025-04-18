import { imageSchema } from '@milkdown/preset-commonmark';
import type { Node } from '@milkdown/prose/model';
import type { NodeViewConstructor } from '@milkdown/prose/view';
import { $view } from '@milkdown/utils';
import DOMPurify from 'dompurify';
import { createApp, ref, watchEffect } from 'vue';

import { addViewEvent, withMeta } from '../../../utils';
import { ImageMenuShowSlice } from '../image-menu';
import { MilkdownImageInline } from './components/image-inline';
import { inlineImageConfig } from './config';

export const inlineImageView = $view(imageSchema.node, (ctx): NodeViewConstructor => {
  return (initialNode, view, getPos) => {
    const src = ref(initialNode.attrs.src);
    const alt = ref(initialNode.attrs.alt);
    const title = ref(initialNode.attrs.title);
    const selected = ref(false);
    const readonly = ref(!view.editable);
    const setAttr = (attr: string, value: unknown) => {
      const pos = getPos();
      if (pos == null) return;
      view.dispatch(
        view.state.tr.setNodeAttribute(
          pos,
          attr,
          attr === 'src' ? DOMPurify.sanitize(value as string) : value,
        ),
      );
    };

    const config = ctx.get(inlineImageConfig.key);
    const app = createApp(MilkdownImageInline, {
      src,
      alt,
      title,
      selected,
      readonly,
      setAttr,
      config,
    });
    const dom = document.createElement('span');
    dom.className = 'milkdown-image-inline';
    app.mount(dom);
    const disposeSelectedWatcher = watchEffect(() => {
      const isSelected = selected.value;
      if (isSelected) {
        dom.classList.add('selected');
      } else {
        dom.classList.remove('selected');
      }
    });
    const proxyDomURL = config.proxyDomURL;
    const bindAttrs = (node: Node) => {
      if (!proxyDomURL) {
        src.value = node.attrs.src;
      } else {
        const proxiedURL = proxyDomURL(node.attrs.src);
        if (typeof proxiedURL === 'string') {
          src.value = proxiedURL;
        } else {
          proxiedURL
            .then((url) => {
              src.value = url;
            })
            .catch(console.error);
        }
      }
      alt.value = node.attrs.alt;
      title.value = node.attrs.title;
    };
    bindAttrs(initialNode);

    // ==== 修改 ====
    let removePointerUpEvent = addViewEvent(dom, 'pointerup', () => {
      const img = dom.querySelector('img');
      if (!img) return;
      const showMenu = ctx?.get(ImageMenuShowSlice);
      showMenu?.(dom, {
        img,
        imageUrl: src.value,
        title: alt.value,
        caption: title.value,
        setImageUrl: (newImageUrl) => {
          src.value = newImageUrl;
        },
        setCaption: (newCaption) => {
          title.value = newCaption;
        },
        onUpload: async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return false;
          const url = await config?.onUpload(file);
          if (!url) return false;
          src.value = url;
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
        if (e.target instanceof HTMLInputElement) return true;

        return false;
      },
      selectNode: () => {
        selected.value = true;
      },
      deselectNode: () => {
        selected.value = false;
      },
      destroy: () => {
        if (removePointerUpEvent) {
          removePointerUpEvent();
          removePointerUpEvent = null;
        }
        disposeSelectedWatcher();
        app.unmount();
        dom.remove();
      },
    };
  };
});

withMeta(inlineImageView, {
  displayName: 'NodeView<image-inline>',
  group: 'ImageInline',
});
