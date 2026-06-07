import { Children, type ReactNode, isValidElement } from "react";
import { StyleSheet } from "react-native";
import { SizableText, Menu as TamaguiMenu, YStack } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { resolveAriaLabel } from "@/components/ui/utils";

import type {
  MenuArrowProps,
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuGroupProps,
  MenuItemIconProps,
  MenuItemIndicatorProps,
  MenuItemProps,
  MenuItemTitleProps,
  MenuLabelProps,
  MenuPortalProps,
  MenuProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuScrollViewProps,
  MenuSeparatorProps,
  MenuSubContentProps,
  MenuSubProps,
  MenuSubTriggerProps,
  MenuTriggerProps,
} from "./types";

const DEFAULT_MENU_ENTER_STYLE = { opacity: 0, scale: 0.96, y: -4 } as const;
const DEFAULT_MENU_EXIT_STYLE = { opacity: 0, scale: 0.98, y: -2 } as const;

function mergeMenuStyle<T extends object>(baseStyle: T, style: unknown): T {
  return StyleSheet.flatten([baseStyle, style] as any) as T;
}

function normalizeMenuChildren(children: ReactNode) {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <SizableText>{child}</SizableText>;
    }

    if (isValidElement(child)) {
      return child;
    }

    return child;
  });
}

function getChildrenTextValue(children: ReactNode) {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  return undefined;
}

function getMenuItemTextValue(label: ReactNode, fallback: string) {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }

  return fallback;
}

function MenuRoot(props: MenuProps) {
  const {
    arrow,
    arrowProps,
    children,
    contentProps,
    itemProps,
    items,
    offset,
    portalProps,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure = trigger != null || items != null || arrow != null;

  // Menu 在 native 上浮动定位后视觉顺序反转，统一反转 children / items
  const resolvedChildren = Children.toArray(children).reverse();
  const resolvedItems = items ? [...items].reverse() : items;

  if (!hasDefaultStructure) {
    return (
      <TamaguiMenu {...rootProps} offset={offset ?? 8}>
        {resolvedChildren}
      </TamaguiMenu>
    );
  }

  return (
    <TamaguiMenu {...rootProps} offset={offset ?? 8}>
      {trigger != null ? <MenuTrigger {...triggerProps}>{trigger}</MenuTrigger> : null}
      <MenuPortal {...portalProps}>
        <MenuContent {...contentProps}>
          {arrow ? <MenuArrow {...arrowProps} /> : null}
          <MenuScrollView>
            {resolvedItems?.map((item) => {
              if (item.separator) {
                return <MenuSeparator key={item.value} />;
              }

              const label = item.label ?? item.value;

              return (
                <MenuItem
                  {...itemProps}
                  aria-label={resolveAriaLabel(
                    item["aria-label"] ?? itemProps?.["aria-label"],
                    label,
                  )}
                  destructive={item.destructive ?? itemProps?.destructive}
                  disabled={item.disabled ?? itemProps?.disabled}
                  key={item.value}
                  onSelect={item.onSelect ?? item.onPress}
                  textValue={item.textValue ?? getMenuItemTextValue(label, item.value)}
                >
                  <MenuItemTitle>{label}</MenuItemTitle>
                  {item.indicator != null ? (
                    <MenuItemIndicator>{item.indicator}</MenuItemIndicator>
                  ) : null}
                </MenuItem>
              );
            })}
            {resolvedChildren}
          </MenuScrollView>
        </MenuContent>
      </MenuPortal>
    </TamaguiMenu>
  );
}

function MenuTrigger(props: MenuTriggerProps) {
  return <TamaguiMenu.Trigger asChild={props.asChild ?? isWeb()} {...props} />;
}

function MenuPortal(props: MenuPortalProps) {
  return <TamaguiMenu.Portal {...props} zIndex={props.zIndex ?? 100} />;
}

function MenuContent(props: MenuContentProps) {
  const { boxShadow, enterStyle, exitStyle, style, transition, ...contentProps } = props;

  return (
    <TamaguiMenu.Content
      {...contentProps}
      boxShadow={boxShadow ?? "0 4px 5px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_MENU_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_MENU_EXIT_STYLE}
      style={mergeMenuStyle({ borderRadius: 16 }, style)}
      transition={transition ?? "100ms"}
    />
  );
}

function MenuScrollView(props: MenuScrollViewProps) {
  const { children, ...scrollViewProps } = props;

  return (
    <TamaguiMenu.ScrollView {...scrollViewProps}>
      <YStack p={5}>{children}</YStack>
    </TamaguiMenu.ScrollView>
  );
}

function MenuGroup(props: MenuGroupProps) {
  return <TamaguiMenu.Group {...props} />;
}

function MenuLabel(props: MenuLabelProps) {
  const { style, ...labelProps } = props;

  return (
    <TamaguiMenu.Label
      {...labelProps}
      color={props.color ?? "$color9"}
      select={props.select ?? "none"}
      size={props.size ?? "$3"}
      style={mergeMenuStyle({ padding: 5 }, style)}
    />
  );
}

function MenuItem(props: MenuItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiMenu.Item {...itemProps} textValue={textValue ?? getChildrenTextValue(children)}>
      {normalizeMenuChildren(children)}
    </TamaguiMenu.Item>
  );
}

function MenuItemTitle(props: MenuItemTitleProps) {
  return <TamaguiMenu.ItemTitle {...props} />;
}

function MenuItemIcon(props: MenuItemIconProps) {
  return <TamaguiMenu.ItemIcon {...props} />;
}

function MenuCheckboxItem(props: MenuCheckboxItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiMenu.CheckboxItem
      {...itemProps}
      textValue={textValue ?? getChildrenTextValue(children)}
    >
      {normalizeMenuChildren(children)}
    </TamaguiMenu.CheckboxItem>
  );
}

function MenuRadioGroup(props: MenuRadioGroupProps) {
  return <TamaguiMenu.RadioGroup {...props} />;
}

function MenuRadioItem(props: MenuRadioItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiMenu.RadioItem {...itemProps} textValue={textValue ?? getChildrenTextValue(children)}>
      {normalizeMenuChildren(children)}
    </TamaguiMenu.RadioItem>
  );
}

function MenuItemIndicator(props: MenuItemIndicatorProps) {
  return <TamaguiMenu.ItemIndicator {...props} />;
}

function MenuSeparator(props: MenuSeparatorProps) {
  return <TamaguiMenu.Separator {...props} />;
}

function MenuArrow(props: MenuArrowProps) {
  return (
    <TamaguiMenu.Arrow
      {...props}
      borderColor={props.borderColor ?? "$borderColor"}
      borderWidth={props.borderWidth ?? 1}
      size={props.size ?? "$4"}
    />
  );
}

function MenuSub(props: MenuSubProps) {
  return <TamaguiMenu.Sub {...props} />;
}

function MenuSubTrigger(props: MenuSubTriggerProps) {
  const { children, textValue, ...subTriggerProps } = props;

  return (
    <TamaguiMenu.SubTrigger
      {...subTriggerProps}
      textValue={textValue ?? getChildrenTextValue(children)}
    >
      {normalizeMenuChildren(children)}
    </TamaguiMenu.SubTrigger>
  );
}

function MenuSubContent(props: MenuSubContentProps) {
  const { boxShadow, enterStyle, exitStyle, style, transition, ...contentProps } = props;

  return (
    <TamaguiMenu.SubContent
      {...contentProps}
      boxShadow={boxShadow ?? "0 4px 5px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_MENU_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_MENU_EXIT_STYLE}
      style={mergeMenuStyle({ borderRadius: 16, padding: 5 }, style)}
      transition={transition ?? "100ms"}
    />
  );
}

MenuRoot.displayName = "Menu";
MenuTrigger.displayName = "Trigger";
MenuPortal.displayName = "Portal";
MenuContent.displayName = "Content";
MenuScrollView.displayName = "ScrollView";
MenuGroup.displayName = "Group";
MenuLabel.displayName = "Label";
MenuItem.displayName = "Item";
MenuItemTitle.displayName = "ItemTitle";
MenuItemIcon.displayName = "ItemIcon";
MenuCheckboxItem.displayName = "CheckboxItem";
MenuRadioGroup.displayName = "RadioGroup";
MenuRadioItem.displayName = "RadioItem";
MenuItemIndicator.displayName = "ItemIndicator";
MenuSeparator.displayName = "Separator";
MenuArrow.displayName = "Arrow";
MenuSub.displayName = "Sub";
MenuSubTrigger.displayName = "SubTrigger";
MenuSubContent.displayName = "SubContent";

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Content: MenuContent,
  ScrollView: MenuScrollView,
  Group: MenuGroup,
  Label: MenuLabel,
  Item: MenuItem,
  ItemTitle: MenuItemTitle,
  ItemIcon: MenuItemIcon,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  ItemIndicator: MenuItemIndicator,
  Separator: MenuSeparator,
  Arrow: MenuArrow,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
});
