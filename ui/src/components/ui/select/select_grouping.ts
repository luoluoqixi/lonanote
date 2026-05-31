import type { SelectItemData, SelectItemGroupData } from "./types";

export type ResolvedSelectItemData = SelectItemData & {
  groupKey: string;
  index: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

export type ResolvedSelectItemGroupData = Omit<SelectItemGroupData, "items" | "key"> & {
  key: string;
  items: ResolvedSelectItemData[];
};

export function resolveSelectItemGroups(options: {
  itemGroups?: SelectItemGroupData[];
  items?: SelectItemData[];
  options?: SelectItemData[];
}): ResolvedSelectItemGroupData[] {
  const sourceGroups =
    options.itemGroups ??
    (options.items != null || options.options != null
      ? [{ key: "default", items: options.items ?? options.options ?? [] }]
      : []);
  let nextIndex = 0;

  return sourceGroups
    .filter((group) => group.items.length > 0)
    .map((group, groupIndex) => {
      const groupKey = group.key ?? `group-${groupIndex}`;

      return {
        ...group,
        key: groupKey,
        items: group.items.map((item, itemIndex) => ({
          ...item,
          groupKey,
          index: nextIndex++,
          isFirstInGroup: itemIndex === 0,
          isLastInGroup: itemIndex === group.items.length - 1,
        })),
      };
    });
}
