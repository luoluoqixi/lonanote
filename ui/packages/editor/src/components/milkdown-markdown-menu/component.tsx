import { Icon } from '@milkdown/kit/component';
import type { Ctx } from '@milkdown/kit/ctx';
import { type Ref, defineComponent, h, onUnmounted, ref, watch, watchEffect } from 'vue';

h;

export interface MarkdownMenuOption {
  key: string;
  label: string;
  icon: string;
}

export type MarkdownMenuProps = {
  ctx: Ctx;
  show: Ref<boolean>;
  hide: () => void;

  title?: Ref<string>;
  options: MarkdownMenuOption[];
  onMenuClick?: (option: MarkdownMenuOption, index: number, ctx: Ctx) => void;
};

export const MarkdownMenu = defineComponent<MarkdownMenuProps>({
  props: {
    ctx: {
      type: Object,
      required: true,
    },
    show: {
      type: Object,
      required: true,
    },
    hide: {
      type: Function,
      required: true,
    },
    options: {
      type: Array,
      required: true,
    },
    onMenuClick: {
      type: Function,
      required: false,
    },
    title: {
      type: Object,
      required: false,
    },
  },
  setup({ ctx, show, options, hide, onMenuClick, title }) {
    const host = ref<HTMLElement>();
    const hoverIndex = ref(0);
    const prevMousePosition = ref({ x: -999, y: -999 });

    const onPointerMove = (e: MouseEvent) => {
      const { x, y } = e;
      prevMousePosition.value = { x, y };
    };

    watch([options, show], () => {
      const size = options.length;
      if (size === 0 && show.value) hide();
      else if (hoverIndex.value >= size) hoverIndex.value = 0;
    });

    const onHover = (
      index: number | ((prev: number) => number),
      after?: (index: number) => void,
    ) => {
      const prevHoverIndex = hoverIndex.value;
      const next = typeof index === 'function' ? index(prevHoverIndex) : index;
      after?.(next);
      hoverIndex.value = next;
    };

    const scrollToIndex = (index: number) => {
      const target = host.value?.querySelector<HTMLElement>(`[data-index="${index}"]`);
      const scrollRoot = host.value?.querySelector<HTMLElement>('.menu-groups');

      if (!target || !scrollRoot) return;

      scrollRoot.scrollTop = target.offsetTop - scrollRoot.offsetTop;
    };

    const runByIndex = (index: number) => {
      const item = options?.at(index);
      if (onMenuClick && item && ctx) onMenuClick(item, index, ctx);

      hide?.();
    };

    const onKeydown = (e: KeyboardEvent) => {
      const size = options.length;
      if (e.key === 'Escape') {
        e.preventDefault();
        hide?.();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        return onHover((index) => (index < size - 1 ? index + 1 : index), scrollToIndex);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        return onHover((index) => (index <= 0 ? index : index - 1), scrollToIndex);
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        runByIndex(hoverIndex.value);
      }
    };

    const getOnPointerEnter = (index: number) => (e: MouseEvent) => {
      const prevPos = prevMousePosition.value;
      if (!prevPos) return;

      const { x, y } = e;
      if (x === prevPos.x && y === prevPos.y) return;

      onHover(index);
    };

    watchEffect(() => {
      const isShown = show.value;
      if (isShown) {
        window.addEventListener('keydown', onKeydown, { capture: true });
      } else {
        window.removeEventListener('keydown', onKeydown, { capture: true });
      }
    });
    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown, { capture: true });
    });

    return () => {
      return (
        <div ref={host} onPointerdown={(e) => e.preventDefault()}>
          <div class="menu-groups" onPointermove={onPointerMove}>
            <div class="menu-group">
              <h6>{title.value}</h6>
              <ul>
                {options.map((item, index) => (
                  <li
                    key={item.key}
                    data-index={index}
                    class={hoverIndex.value === index ? 'hover' : ''}
                    onPointerenter={getOnPointerEnter(index)}
                    onPointerdown={() => {
                      host.value?.querySelector(`[data-index="${index}"]`)?.classList.add('active');
                    }}
                    onPointerup={() => {
                      host.value
                        ?.querySelector(`[data-index="${index}"]`)
                        ?.classList.remove('active');
                      runByIndex(index);
                    }}
                  >
                    <Icon icon={item.icon} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );
    };
  },
});
