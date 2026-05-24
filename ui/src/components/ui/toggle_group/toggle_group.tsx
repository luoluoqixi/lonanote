import type { ComponentType, ReactNode } from "react";
import { ToggleGroup as TamaguiToggleGroup } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type { ToggleGroupItemProps, ToggleGroupProps } from "./types";

type ToggleGroupPrimitiveProps = { children?: ReactNode; [key: string]: unknown };
const ToggleGroupPrimitive =
  TamaguiToggleGroup as unknown as ComponentType<ToggleGroupPrimitiveProps>;

function ToggleGroupRoot(props: ToggleGroupProps) {
  const { children, itemProps, items, ...rootProps } = props;
  const content =
    children ??
    items?.map((item) => (
      <ToggleGroupItem
        {...itemProps}
        aria-label={resolveAriaLabel(item["aria-label"] ?? itemProps?.["aria-label"], item.label)}
        disabled={item.disabled ?? itemProps?.disabled}
        key={item.value}
        value={item.value}
      >
        {item.label}
      </ToggleGroupItem>
    ));

  if (rootProps.type === "multiple") {
    return <ToggleGroupPrimitive {...rootProps}>{content}</ToggleGroupPrimitive>;
  }

  return (
    <ToggleGroupPrimitive {...rootProps} type={rootProps.type ?? "single"}>
      {content}
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem(props: ToggleGroupItemProps) {
  return <TamaguiToggleGroup.Item {...props} />;
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
  Item: ToggleGroupItem,
});
