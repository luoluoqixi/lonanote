import { ToggleGroup as TamaguiToggleGroup } from "tamagui";

import type { ToggleGroupItemProps, ToggleGroupProps } from "./types";

function ToggleGroupRoot(props: ToggleGroupProps) {
  const { children, itemProps, items, ...rootProps } = props;

  return (
    <TamaguiToggleGroup {...rootProps}>
      {children ??
        items?.map((item) => (
          <ToggleGroupItem
            {...itemProps}
            disabled={item.disabled ?? itemProps?.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </ToggleGroupItem>
        ))}
    </TamaguiToggleGroup>
  );
}

function ToggleGroupItem(props: ToggleGroupItemProps) {
  return <TamaguiToggleGroup.Item {...props} />;
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
  Item: ToggleGroupItem,
});
