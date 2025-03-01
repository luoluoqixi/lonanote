import { CSSProperties, useMemo, useState } from 'react';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import { Virtuoso } from 'react-virtuoso';

export interface TreeItem<T> {
  id: string | number;
  label?: string;
  isLeaf?: boolean;
  children?: TreeItem<T>[] | null;
  data?: T;
}

export interface TreeItemProps<T> {
  style?: CSSProperties;
  className?: string;
  customRender?: (data: TreeItemFlattenData<T>, context: TreeItemContext) => React.ReactNode;
}

export interface TreeProps<T> {
  style?: CSSProperties;
  className?: string;
  itemsProps?: TreeItemProps<T>;
  items: TreeItem<T>[];
  /** 展开全部 */
  expandAll?: boolean;
  /** 视口区域外需要多渲染多大区域 */
  increaseViewportBy?: number;
  /** 固定itemHeight */
  fixedItemHeight?: number;
}

export interface TreeItemFlattenData<T> {
  id: string | number;
  depth: number;
  label?: string;
  isLeaf?: boolean;
  expand?: boolean;
  data?: T;
}

export interface TreeItemContext {
  isScrolling: boolean;
  fixedItemHeight?: number;
}

const defaultIncreaseViewportBy = 300;

const getTreeItemRender = <T,>(
  data: TreeItemFlattenData<T>,
  context: TreeItemContext,
  props?: TreeItemProps<T>,
) => {
  const customRender = props?.customRender;
  const left = data.depth * 20;
  return customRender ? (
    customRender(data, context)
  ) : (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        height: context.fixedItemHeight,
        ...props?.style,
      }}
      className={props?.className}
    >
      <div style={{ marginLeft: left, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 20 }}>
          {!data.isLeaf && (data.expand ? <VscChevronDown /> : <VscChevronRight />)}
        </div>
        {data.label}
      </div>
    </div>
  );
};

const getFlattenData = <T,>(
  items: TreeItem<T>[],
  isExpand: (id: string | number) => boolean,
): TreeItemFlattenData<T>[] => {
  const flattenNode = (node: TreeItem<T>, depth: number, result: TreeItemFlattenData<T>[]) => {
    const { id, label, isLeaf, children } = node;
    const expand = isExpand(id);
    result.push({
      id,
      label,
      isLeaf,
      depth,
      expand,
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

export const Tree = <T,>(props: TreeProps<T>) => {
  const { items, style, className, expandAll, increaseViewportBy, fixedItemHeight, itemsProps } =
    props;
  const [isScrolling, setIsScrolling] = useState(false);
  const [expandIds, setExpandIds] = useState<string[] | number[]>(() => []);
  const data = useMemo(
    () => getFlattenData(items, (id) => expandAll || expandIds.includes(id as never)),
    [items],
  );
  return (
    <Virtuoso
      style={{ height: '100%', ...style }}
      className={className}
      isScrolling={setIsScrolling}
      context={{ isScrolling, fixedItemHeight }}
      totalCount={data.length}
      itemContent={(index, _, context) => getTreeItemRender(data[index], context, itemsProps)}
      fixedItemHeight={fixedItemHeight}
      increaseViewportBy={
        increaseViewportBy != null ? increaseViewportBy : defaultIncreaseViewportBy
      }
    />
  );
};
