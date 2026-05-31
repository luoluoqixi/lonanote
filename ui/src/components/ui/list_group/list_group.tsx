import { Fragment } from "react";
import { YGroup } from "tamagui";

import { ListItem } from "../list_item";
import { Separator } from "../separator";
import type { ListGroupGroupItemProps, ListGroupItemData, ListGroupProps } from "./types";

function ListGroupItemSlot(props: ListGroupGroupItemProps) {
  return <YGroup.Item {...props} />;
}

function getItemKey(item: ListGroupItemData, index: number) {
  if (item.key) {
    return item.key;
  }

  if (typeof item.title === "string") {
    return item.title;
  }

  return `list-group-item-${index}`;
}

function getItemsContent(
  items: ListGroupItemData[] | undefined,
  itemProps: ListGroupProps["itemProps"],
  groupItemProps: ListGroupProps["groupItemProps"],
  nativeHaptics: ListGroupProps["nativeHaptics"],
  separator: boolean | undefined,
  separatorProps: ListGroupProps["separatorProps"],
) {
  return items?.map((item, index) => {
    const shouldShowSeparator = index > 0 && (item.showSeparator ?? separator);

    return (
      <Fragment key={getItemKey(item, index)}>
        {shouldShowSeparator ? <Separator {...separatorProps} /> : null}
        <ListGroupItemSlot {...groupItemProps} {...item.groupItemProps}>
          <ListItem
            {...itemProps}
            {...item}
            nativeHaptics={item.nativeHaptics ?? itemProps?.nativeHaptics ?? nativeHaptics}
          />
        </ListGroupItemSlot>
      </Fragment>
    );
  });
}

function ListGroupRoot(props: ListGroupProps) {
  const {
    children,
    groupItemProps,
    itemProps,
    items,
    nativeHaptics,
    separator,
    separatorProps,
    ...groupProps
  } = props;

  return (
    <YGroup
      {...groupProps}
      borderColor={groupProps.borderColor ?? "$borderColor"}
      borderWidth={groupProps.borderWidth ?? 1}
      overflow={groupProps.overflow ?? "hidden"}
    >
      {children ??
        getItemsContent(items, itemProps, groupItemProps, nativeHaptics, separator, separatorProps)}
    </YGroup>
  );
}

export const ListGroup = Object.assign(ListGroupRoot, {
  Group: YGroup,
  GroupItem: ListGroupItemSlot,
  Item: ListItem,
  Separator,
});

export type { ListGroupGroupItemProps, ListGroupItemData, ListGroupProps };
