import { Children, type ReactNode, isValidElement } from "react";
import { SizableText, ToggleGroup as TamaguiToggleGroup, XGroup, XStack, YGroup } from "tamagui";

import { os } from "@/api/common/platform";
import { resolveAriaLabel } from "@/components/ui/utils";

import type { ToggleGroupItemData, ToggleGroupItemProps, ToggleGroupProps } from "./types";

const ToggleGroupPrimitive = TamaguiToggleGroup;
const DEFAULT_ACTIVE_STYLE = {
  backgroundColor: "$color5",
  borderColor: undefined,
} as const;

function wrapToggleChildForIos(child: ReactNode) {
  if (os() !== "ios") {
    return child;
  }

  return (
    <XStack accessible={false} pointerEvents="none">
      {child}
    </XStack>
  );
}

function normalizeToggleChildren(children: ReactNode) {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return wrapToggleChildForIos(<SizableText accessible={false}>{child}</SizableText>);
    }

    if (isValidElement(child)) {
      return wrapToggleChildForIos(child);
    }

    return child;
  });
}

function ToggleGroupRoot(props: ToggleGroupProps) {
  if (props.type === "multiple") {
    return <ToggleGroupMultipleRoot {...props} />;
  }

  return <ToggleGroupSingleRoot {...props} />;
}

const getItemsContent = (
  children: ReactNode,
  items: ToggleGroupItemData[] | undefined,
  itemProps: Omit<ToggleGroupItemProps, "value"> | undefined,
  orientation: "horizontal" | "vertical",
) => {
  const Group = orientation === "vertical" ? YGroup : XGroup;
  const content =
    children ??
    items?.map((item) => (
      <Group.Item key={item.value}>
        <ToggleGroupItem
          {...itemProps}
          aria-label={resolveAriaLabel(item["aria-label"] ?? itemProps?.["aria-label"], item.label)}
          disabled={item.disabled ?? itemProps?.disabled}
          borderRadius="$4"
          value={item.value}
        >
          {item.label}
        </ToggleGroupItem>
      </Group.Item>
    ));
  return <Group>{content}</Group>;
};

function ToggleGroupSingleRoot(props: Extract<ToggleGroupProps, { type?: "single" }>) {
  const { children, itemProps, items, orientation, ...rootProps } = props;
  const resolvedOrientation = orientation || "horizontal";
  const content = getItemsContent(children, items, itemProps, resolvedOrientation);
  return (
    <ToggleGroupPrimitive
      disableDeactivation={true}
      orientation={resolvedOrientation}
      {...rootProps}
      type="single"
    >
      {content}
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupMultipleRoot(props: Extract<ToggleGroupProps, { type: "multiple" }>) {
  const { children, itemProps, items, orientation, ...rootProps } = props;
  const resolvedOrientation = orientation || "horizontal";
  const content = getItemsContent(children, items, itemProps, resolvedOrientation);
  return (
    <ToggleGroupPrimitive orientation={resolvedOrientation} {...rootProps} type="multiple">
      {content}
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem(props: ToggleGroupItemProps) {
  const { activeStyle, children, ...itemProps } = props;

  return (
    <TamaguiToggleGroup.Item {...itemProps} activeStyle={activeStyle ?? DEFAULT_ACTIVE_STYLE}>
      {normalizeToggleChildren(children)}
    </TamaguiToggleGroup.Item>
  );
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
  Item: ToggleGroupItem,
});
