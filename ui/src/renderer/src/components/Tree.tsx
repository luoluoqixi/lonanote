import { Stack } from '@chakra-ui/react';
import { CSSProperties, MouseEvent, PointerEvent, useMemo, useState } from 'react';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import { Virtuoso } from 'react-virtuoso';

export interface TreeItem<T> {
  id: string;
  label?: string;
  isLeaf?: boolean;
  children?: TreeItem<T>[] | null;
  data?: T;
}

export interface TreeItemProps<T> {
  style?: CSSProperties;
  className?: string;
  onClick?: (
    e: MouseEvent<HTMLDivElement>,
    data: TreeItemFlattenData<T>,
    context: TreeItemContext,
    state: TreeItemState,
  ) => void;
  onDoubleClick?: (
    e: MouseEvent<HTMLDivElement>,
    data: TreeItemFlattenData<T>,
    context: TreeItemContext,
    state: TreeItemState,
  ) => void;
  onRightDown?: (
    e: PointerEvent<HTMLDivElement>,
    data: TreeItemFlattenData<T>,
    context: TreeItemContext,
    state: TreeItemState,
  ) => void;
  customRender?: (
    data: TreeItemFlattenData<T>,
    context: TreeItemContext,
    state: TreeItemState,
  ) => React.ReactNode;
}

export interface TreeProps<T> {
  onExpandIdsChange?: (
    newExpandIds: Record<string, boolean | undefined>,
    oldExpandIds: Record<string, boolean | undefined>,
  ) => void;
  onSelectIdsChange?: (
    newSelectIds: Record<string, boolean | undefined>,
    oldSelectIds: Record<string, boolean | undefined>,
  ) => void;
  style?: CSSProperties;
  className?: string;
  itemsProps?: TreeItemProps<T>;
  items: TreeItem<T>[];
  multipleCtrl?: boolean;
  multipleShift?: boolean;
  /** 选择项的id */
  selectIds?: Record<string, boolean | undefined>;
  /** 展开项的id */
  expandIds?: Record<string, boolean | undefined>;
  /** 展开全部 */
  expandAll?: boolean;
  /** 视口区域外需要多渲染多大区域 */
  increaseViewportBy?: number;
  /** 固定itemHeight */
  fixedItemHeight?: number;
}

export interface TreeItemFlattenData<T> {
  id: string;
  depth: number;
  label?: string;
  isLeaf?: boolean;
  data?: T;
}

export interface TreeItemContext {
  isScrolling: boolean;
  fixedItemHeight?: number;
  onExpand: (id: string, expand: boolean) => void;
  onSelect: (id: string, select: boolean, multiple: boolean) => void;
  multipleCtrl?: boolean;
  multipleShift?: boolean;
}

export interface TreeItemState {
  select: boolean;
  expand: boolean;
}

export interface TreeRowProps<T> {
  data: TreeItemFlattenData<T>;
  context: TreeItemContext;
  props?: TreeItemProps<T>;
  state: TreeItemState;
}

const defaultIncreaseViewportBy = 300;

const getFlattenData = <T,>(
  items: TreeItem<T>[],
  isExpand: (id: string) => boolean,
): TreeItemFlattenData<T>[] => {
  const flattenNode = (node: TreeItem<T>, depth: number, result: TreeItemFlattenData<T>[]) => {
    const { id, label, isLeaf, children, data } = node;
    const expand = isExpand(id);
    result.push({
      id,
      label,
      isLeaf,
      depth,
      data,
    });
    if (expand && children) {
      for (const child of children) {
        flattenNode(child, depth + 1, result);
      }
    }
  };
  const result: TreeItemFlattenData<T>[] = [];
  for (const node of items) {
    flattenNode(node, 1, result);
  }
  return result;
};

export const TreeRow = <T,>({ data, context, props, state }: TreeRowProps<T>) => {
  const customRender = props?.customRender;
  const left = (data.depth - 1) * 20 + 10;
  const onRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if (data.isLeaf) {
      const multiple = (context.multipleCtrl && e.ctrlKey) || (context.multipleShift && e.shiftKey);
      const targetSelect = multiple ? !state.select : true;
      context.onSelect(data.id, targetSelect, multiple || false);
    } else {
      const targetExpand = !state.expand;
      context.onExpand(data.id, targetExpand);
    }
    if (props?.onClick) {
      props.onClick(e, data, context, state);
    }
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      if (props?.onRightDown) {
        props.onRightDown(e, data, context, state);
      }
    }
  };
  return (
    <Stack
      style={{
        // display: 'flex',
        // flexDirection: 'row',
        height: context.fixedItemHeight,
        cursor: 'pointer',
        margin: 2,
        ...props?.style,
      }}
      borderRadius="md"
      color="fg"
      bg={state.select ? 'colorPalette.subtle' : 'bg'}
      _hover={{
        bg: 'colorPalette.subtle',
        color: 'fg',
        _icon: { color: 'colorPalette.fg' },
      }}
      _active={{
        bg: 'colorPalette.subtle',
        color: 'fg',
        _icon: { color: 'colorPalette.fg' },
      }}
      onClick={onRowClick}
      onDoubleClick={
        props?.onDoubleClick && ((e) => props.onDoubleClick?.(e, data, context, state))
      }
      onPointerDown={onPointerDown}
      className={props?.className}
    >
      {customRender ? (
        customRender(data, context, state)
      ) : (
        <div
          style={{
            marginLeft: left,
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: 20, flexShrink: 0 }}>
            {!data.isLeaf && (state.expand ? <VscChevronDown /> : <VscChevronRight />)}
          </div>
          <div
            style={{
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
            }}
          >
            {data.label}
          </div>
        </div>
      )}
    </Stack>
  );
};

export const Tree = <T,>(props: TreeProps<T>) => {
  const {
    items,
    style,
    className,
    expandAll,
    increaseViewportBy,
    fixedItemHeight,
    itemsProps,
    selectIds,
    expandIds,
    onExpandIdsChange,
    onSelectIdsChange,
    multipleCtrl = true,
    multipleShift = true,
  } = props;
  const [isScrolling, setIsScrolling] = useState(false);
  const [localExpandIds, setExpandIds] = useState<Record<string, boolean | undefined>>(() => ({}));
  const [localSelectIds, setSelectIds] = useState<Record<string, boolean | undefined>>(() => ({}));
  const data = useMemo(
    () =>
      getFlattenData(
        items,
        (id) => expandAll || (expandIds ? expandIds[id] : localExpandIds[id]) || false,
      ),
    [items, expandIds || localExpandIds, expandAll],
  );
  const onExpand = (id: string, expand: boolean) => {
    if (expandAll) return;
    const updateExpandIds = onExpandIdsChange || setExpandIds;
    const oldIds = expandIds || localExpandIds;
    const newIds = { ...oldIds };
    if (expand) {
      newIds[id] = true;
    } else {
      delete newIds[id];
    }
    updateExpandIds(newIds, oldIds);
  };
  const onSelect = (id: string, select: boolean, multiple: boolean) => {
    const updateSelectIds = onSelectIdsChange || setSelectIds;
    const oldIds = selectIds || localSelectIds;
    const newIds = multiple ? { ...oldIds } : {};
    if (select) {
      newIds[id] = true;
    } else {
      delete newIds[id];
    }
    updateSelectIds(newIds, oldIds);
  };
  return (
    <Virtuoso
      style={{ height: '100%', ...style }}
      className={className}
      isScrolling={setIsScrolling}
      context={
        {
          isScrolling,
          fixedItemHeight,
          onExpand,
          onSelect,
          multipleCtrl,
          multipleShift,
        } as TreeItemContext
      }
      totalCount={data.length}
      itemContent={(index, _, context) => {
        const item = data[index];
        const sIds = selectIds || localSelectIds;
        const eIds = expandIds || localExpandIds;
        return (
          <TreeRow
            data={item}
            context={context}
            props={itemsProps}
            state={{
              select: sIds[item.id] === true,
              expand: expandAll || eIds[item.id] === true,
            }}
          />
        );
      }}
      cellSpacing={0}
      fixedItemHeight={fixedItemHeight}
      increaseViewportBy={
        increaseViewportBy != null ? increaseViewportBy : defaultIncreaseViewportBy
      }
    />
  );
};
