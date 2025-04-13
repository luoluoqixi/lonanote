/* eslint-disable indent */
import { Ctx } from '@milkdown/kit/ctx';
import {
  Component,
  c,
  html,
  useCallback,
  useEffect,
  useHost,
  useMemo,
  useRef,
  useState,
} from 'atomico';

import { defIfNotExists } from '../../utils';

export interface MarkdownMenuOption {
  key: string;
  label: string;
  icon: ReturnType<typeof html>;
}

export interface MarkdownMenuProps {
  ctx: Ctx;
  options: MarkdownMenuOption[];
  title: string;
  show: boolean;
  hide: () => void;
  onMenuClick: (option: MarkdownMenuOption, index: number, ctx: Ctx) => void;
}

const MarkdownMenuComponent: Component<MarkdownMenuProps> = ({
  ctx,
  options,
  show,
  hide,
  title,
  onMenuClick,
}) => {
  const { size } = useMemo(
    () => ({
      size: options?.length || 0,
    }),
    [options],
  );

  const host = useHost();
  const [hoverIndex, setHoverIndex] = useState(0);

  const root = useMemo(() => host.current.getRootNode() as HTMLElement, [host]);

  const prevMousePosition = useRef({ x: -999, y: -999 });

  const onMouseMove = useCallback((e: MouseEvent) => {
    const prevPos = prevMousePosition.current;
    if (!prevPos) return;

    const { x, y } = e;
    prevPos.x = x;
    prevPos.y = y;
  }, []);

  useEffect(() => {
    if (size === 0 && show) hide?.();
    else if (hoverIndex >= size) setHoverIndex(0);
  }, [size, show]);

  const onHover = useCallback(
    (index: number | ((prev: number) => number), after?: (index: number) => void) => {
      setHoverIndex((prev) => {
        const next = typeof index === 'function' ? index(prev) : index;

        after?.(next);
        return next;
      });
    },
    [],
  );

  const scrollToIndex = useCallback((index: number) => {
    const target = host.current.querySelector<HTMLElement>(`[data-index="${index}"]`);
    const scrollRoot = host.current.querySelector<HTMLElement>('.menu-groups');

    if (!target || !scrollRoot) return;

    scrollRoot.scrollTop = target.offsetTop - scrollRoot.offsetTop;
  }, []);

  const runByIndex = useCallback(
    (index: number) => {
      const item = options?.at(index);
      if (onMenuClick && item && ctx) onMenuClick(item, index, ctx);

      hide?.();
    },
    [options],
  );

  const onKeydown = useCallback(
    (e: KeyboardEvent) => {
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
        runByIndex(hoverIndex);
      }
    },
    [hide, options, hoverIndex],
  );

  const onMouseEnter = useCallback((index: number) => {
    return (e: MouseEvent) => {
      const prevPos = prevMousePosition.current;
      if (!prevPos) return;

      const { x, y } = e;
      if (x === prevPos.x && y === prevPos.y) return;

      onHover(index);
    };
  }, []);

  useEffect(() => {
    if (show) root.addEventListener('keydown', onKeydown, { capture: true });
    else root.removeEventListener('keydown', onKeydown, { capture: true });

    return () => {
      root.removeEventListener('keydown', onKeydown, { capture: true });
    };
  }, [show, onKeydown]);

  return html`
    <host>
      ${show &&
      html`
        <div class="menu-groups" onmousemove=${onMouseMove}>
          <div class="menu-group">
            <h6>${title}</h6>
            <ul>
              ${options?.map(
                (item, index) => html`
                  <li
                    key=${item.key}
                    data-index=${index}
                    class=${hoverIndex === index ? 'hover' : ''}
                    onmouseenter=${onMouseEnter(index)}
                    onmousedown=${() => {
                      host.current
                        .querySelector(`[data-index="${index}"]`)
                        ?.classList.add('active');
                    }}
                    onmouseup=${() => {
                      host.current
                        .querySelector(`[data-index="${index}"]`)
                        ?.classList.remove('active');
                      runByIndex(index);
                    }}
                  >
                    ${item.icon}
                    <span>${item.label}</span>
                  </li>
                `,
              )}
            </ul>
          </div>
        </div>
      `}
    </host>
  `;
};

MarkdownMenuComponent.props = {
  options: Array,
  show: Boolean,
  hide: Function,
  ctx: Object,
  title: String,
  onMenuClick: Function,
};

export const MarkdownMenuTagName = 'milkdown-markdown-menu';
export const MarkdownMenu = c(MarkdownMenuComponent);
defIfNotExists(MarkdownMenuTagName, MarkdownMenu);
