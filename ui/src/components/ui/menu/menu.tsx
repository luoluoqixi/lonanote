import { Menu as TamaguiMenu } from "tamagui";

import type {
  MenuArrowProps,
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuGroupProps,
  MenuItemIndicatorProps,
  MenuItemProps,
  MenuLabelProps,
  MenuPortalProps,
  MenuProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuSeparatorProps,
  MenuTriggerProps,
} from "./types";

function MenuRoot(props: MenuProps) {
  const {
    arrow,
    arrowProps,
    children,
    contentProps,
    itemProps,
    items,
    portalProps,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure = trigger != null || items != null || arrow != null;

  if (!hasDefaultStructure) {
    return <TamaguiMenu {...rootProps}>{children}</TamaguiMenu>;
  }

  return (
    <TamaguiMenu {...rootProps}>
      {trigger != null ? <MenuTrigger {...triggerProps}>{trigger}</MenuTrigger> : null}
      <MenuPortal {...portalProps}>
        <MenuContent {...contentProps}>
          {arrow ? <MenuArrow {...arrowProps} /> : null}
          {items?.map((item) =>
            item.separator ? (
              <MenuSeparator key={item.value} />
            ) : (
              <MenuItem
                {...itemProps}
                disabled={item.disabled ?? itemProps?.disabled}
                key={item.value}
                onPress={item.onPress}
              >
                {item.label ?? item.value}
                {item.indicator != null ? (
                  <MenuItemIndicator>{item.indicator}</MenuItemIndicator>
                ) : null}
              </MenuItem>
            ),
          )}
          {children}
        </MenuContent>
      </MenuPortal>
    </TamaguiMenu>
  );
}

function MenuTrigger(props: MenuTriggerProps) {
  return <TamaguiMenu.Trigger {...props} />;
}

function MenuPortal(props: MenuPortalProps) {
  return <TamaguiMenu.Portal {...props} />;
}

function MenuContent(props: MenuContentProps) {
  return <TamaguiMenu.Content {...props} />;
}

function MenuGroup(props: MenuGroupProps) {
  return <TamaguiMenu.Group {...props} />;
}

function MenuLabel(props: MenuLabelProps) {
  return <TamaguiMenu.Label {...props} />;
}

function MenuItem(props: MenuItemProps) {
  return <TamaguiMenu.Item {...props} />;
}

function MenuCheckboxItem(props: MenuCheckboxItemProps) {
  return <TamaguiMenu.CheckboxItem {...props} />;
}

function MenuRadioGroup(props: MenuRadioGroupProps) {
  return <TamaguiMenu.RadioGroup {...props} />;
}

function MenuRadioItem(props: MenuRadioItemProps) {
  return <TamaguiMenu.RadioItem {...props} />;
}

function MenuItemIndicator(props: MenuItemIndicatorProps) {
  return <TamaguiMenu.ItemIndicator {...props} />;
}

function MenuSeparator(props: MenuSeparatorProps) {
  return <TamaguiMenu.Separator {...props} />;
}

function MenuArrow(props: MenuArrowProps) {
  return <TamaguiMenu.Arrow {...props} />;
}

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Content: MenuContent,
  Group: MenuGroup,
  Label: MenuLabel,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  ItemIndicator: MenuItemIndicator,
  Separator: MenuSeparator,
  Arrow: MenuArrow,
});
