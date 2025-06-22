import clsx from 'clsx';
import { Fragment, defineComponent, h, ref } from 'vue';

import { Icon } from '../../../../../components';
import { ImageMenuToggleSlice } from '../../../../../features/image/image-menu';
import { IMAGE_DATA_TYPE } from '../../schema';
import type { MilkdownImageBlockProps } from './image-block';

h;
Fragment;

export const ImageViewer = defineComponent<MilkdownImageBlockProps>({
  props: {
    ctx: {
      type: Object,
      required: true,
    },
    src: {
      type: Object,
      required: true,
    },
    caption: {
      type: Object,
      required: true,
    },
    ratio: {
      type: Object,
      required: true,
    },
    selected: {
      type: Object,
      required: true,
    },
    readonly: {
      type: Object,
      required: true,
    },
    setAttr: {
      type: Function,
      required: true,
    },
    config: {
      type: Object,
      required: true,
    },
  },
  setup({ ctx, src, caption, ratio, readonly, selected, setAttr, config }) {
    const imageRef = ref<HTMLImageElement>();
    const resizeHandle = ref<HTMLDivElement>();

    // ==== 修改 ====
    const showOperation = ref(false);

    const onImageLoad = () => {
      const image = imageRef.value;
      if (!image) return;

      const host = image.closest('.milkdown-image-block');
      if (!host) return;

      const updateHeight = (maxWidth: number) => {
        const height = image.height;
        const width = image.width;
        const transformedHeight = width < maxWidth ? height : maxWidth * (height / width);
        const h = (transformedHeight * (ratio.value ?? 1)).toFixed(2);
        image.dataset.origin = transformedHeight.toFixed(2);
        image.dataset.height = h;
        image.style.height = `${h}px`;
      };

      const checkWidth = () => {
        const maxWidth = host.getBoundingClientRect().width;
        if (maxWidth <= 0) {
          requestAnimationFrame(checkWidth);
        } else {
          updateHeight(maxWidth);
        }
      };

      requestAnimationFrame(checkWidth);
    };

    const onResizeHandlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const image = imageRef.value;
      if (!image) return;
      const top = image.getBoundingClientRect().top;
      const height = e.clientY - top;
      const h = Number(height < 100 ? 100 : height).toFixed(2);
      image.dataset.height = h;
      image.style.height = `${h}px`;
    };

    const onResizeHandlePointerUp = () => {
      window.removeEventListener('pointermove', onResizeHandlePointerMove);
      window.removeEventListener('pointerup', onResizeHandlePointerUp);

      const image = imageRef.value;
      if (!image) return;

      const originHeight = Number(image.dataset.origin);
      const currentHeight = Number(image.dataset.height);
      const ratio = Number.parseFloat(Number(currentHeight / originHeight).toFixed(2));
      if (Number.isNaN(ratio)) return;

      setAttr('ratio', ratio);
    };

    const onResizeHandlePointerDown = (e: PointerEvent) => {
      if (readonly.value) return;
      e.preventDefault();
      e.stopPropagation();
      window.addEventListener('pointermove', onResizeHandlePointerMove);
      window.addEventListener('pointerup', onResizeHandlePointerUp);
    };

    // ==== 修改 ====
    const onMouseEnter = () => {
      if (readonly.value) return;
      showOperation.value = true;
    };
    const onMouseLeave = () => {
      showOperation.value = false;
    };

    // ==== 修改 ====
    const operationClick = (e: Event) => {
      if (readonly.value) return;
      e.preventDefault();
      e.stopPropagation();
      if (!ctx) return;
      if (!imageRef.value) return;
      const toggleMenu = ctx?.get(ImageMenuToggleSlice);
      const el = (e.target as HTMLElement)?.closest('.operation-item') as HTMLElement | null;
      if (el) {
        toggleMenu?.(el, {
          img: imageRef.value,
          imageUrl: src.value,
          title: caption.value,
          caption: caption.value,
          setImageUrl: (newImageUrl) => {
            setAttr?.('src', newImageUrl);
          },
          setCaption: (newCaption) => {
            setAttr?.('caption', newCaption);
          },
          onUpload: async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return false;
            const url = await config?.onUpload(file);
            if (!url) return false;
            setAttr?.('src', url);
            setAttr?.('caption', file.name);
            setAttr?.('ratio', 1);
            return true;
          },
        });
      }
    };

    return () => {
      return (
        <>
          <div class="image-wrapper" onMouseenter={onMouseEnter} onMouseleave={onMouseLeave}>
            <div class={clsx('image-block-title', selected.value && 'visible')}>
              {caption.value}
            </div>
            <div class={clsx('operation', showOperation.value && 'visible')}>
              <div class="operation-item" onPointerdown={operationClick}>
                <Icon icon={config.operationIcon} />
              </div>
            </div>
            <img
              ref={imageRef}
              data-type={IMAGE_DATA_TYPE}
              onLoad={onImageLoad}
              src={src.value}
              alt={caption.value}
            />
            <div
              ref={resizeHandle}
              class={clsx('image-resize-handle', showOperation.value && 'visible')}
              onPointerdown={onResizeHandlePointerDown}
            >
              <Icon icon={config?.resizeIcon} />
            </div>
          </div>
        </>
      );
    };
  },
});
