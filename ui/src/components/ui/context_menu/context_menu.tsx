import { Children, type ReactNode, isValidElement } from "react";
import { StyleSheet } from "react-native";
import { SizableText, ContextMenu as TamaguiContextMenu } from "tamagui";

import { isWeb, os } from "@/api/common/platform";
import { resolveAriaLabel, triggerNativeHaptics } from "@/components/ui/utils";

import type {
  ContextMenuArrowProps,
  ContextMenuCheckboxItemProps,
  ContextMenuContentProps,
  ContextMenuGroupProps,
  ContextMenuItemIconProps,
  ContextMenuItemImageProps,
  ContextMenuItemIndicatorProps,
  ContextMenuItemProps,
  ContextMenuItemSubtitleProps,
  ContextMenuItemTitleProps,
  ContextMenuLabelProps,
  ContextMenuPortalProps,
  ContextMenuPreviewProps,
  ContextMenuProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSeparatorProps,
  ContextMenuSubContentProps,
  ContextMenuSubProps,
  ContextMenuSubTriggerProps,
  ContextMenuTriggerProps,
} from "./types";

const DEFAULT_CONTEXT_MENU_ENTER_STYLE = { opacity: 0, scale: 0.96, y: -4 } as const;
const DEFAULT_CONTEXT_MENU_EXIT_STYLE = { opacity: 0, scale: 0.98, y: -2 } as const;

function mergeContextMenuStyle<T extends object>(baseStyle: T, style: unknown): T {
  return StyleSheet.flatten([baseStyle, style] as any) as T;
}

function normalizeContextMenuChildren(children: ReactNode) {
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

function getItemTextValue(label: ReactNode, fallback: string) {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }

  return fallback;
}

function ContextMenuRoot(props: ContextMenuProps) {
  const {
    arrow,
    arrowProps,
    children,
    contentProps,
    itemProps,
    items,
    nativeHaptics,
    onOpenChange,
    portalProps,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure = trigger != null || items != null || arrow != null;
  const handleOpenChange: NonNullable<ContextMenuProps["onOpenChange"]> = (nextOpen) => {
    onOpenChange?.(nextOpen);

    if (!nextOpen || os() === "ios") {
      return;
    }

    triggerNativeHaptics(nativeHaptics);
  };

  if (!hasDefaultStructure) {
    return (
      <TamaguiContextMenu {...rootProps} onOpenChange={handleOpenChange}>
        {children}
      </TamaguiContextMenu>
    );
  }

  return (
    <TamaguiContextMenu {...rootProps} onOpenChange={handleOpenChange}>
      {trigger != null ? (
        <ContextMenuTrigger {...triggerProps}>{trigger}</ContextMenuTrigger>
      ) : null}
      <ContextMenuPortal {...portalProps}>
        <ContextMenuContent {...contentProps}>
          {arrow ? <ContextMenuArrow {...arrowProps} /> : null}
          {items?.map((item) => {
            if (item.separator) {
              return <ContextMenuSeparator key={item.value} />;
            }

            const label = item.label ?? item.value;

            return (
              <ContextMenuItem
                {...itemProps}
                aria-label={resolveAriaLabel(
                  item["aria-label"] ?? itemProps?.["aria-label"],
                  label,
                )}
                destructive={item.destructive ?? itemProps?.destructive}
                disabled={item.disabled ?? itemProps?.disabled}
                key={item.value}
                onSelect={item.onSelect ?? item.onPress}
                textValue={item.textValue ?? getItemTextValue(label, item.value)}
              >
                <ContextMenuItemTitle>{label}</ContextMenuItemTitle>
                {item.indicator != null ? (
                  <ContextMenuItemIndicator>{item.indicator}</ContextMenuItemIndicator>
                ) : null}
              </ContextMenuItem>
            );
          })}
          {children}
        </ContextMenuContent>
      </ContextMenuPortal>
    </TamaguiContextMenu>
  );
}

function ContextMenuTrigger(props: ContextMenuTriggerProps) {
  return <TamaguiContextMenu.Trigger asChild={props.asChild ?? isWeb()} {...props} />;
}

function ContextMenuPortal(props: ContextMenuPortalProps) {
  return <TamaguiContextMenu.Portal {...props} zIndex={props.zIndex ?? 100} />;
}

function ContextMenuContent(props: ContextMenuContentProps) {
  const { boxShadow, enterStyle, exitStyle, style, transition, ...contentProps } = props;

  return (
    <TamaguiContextMenu.Content
      {...contentProps}
      boxShadow={boxShadow ?? "0 4px 5px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_CONTEXT_MENU_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_CONTEXT_MENU_EXIT_STYLE}
      style={mergeContextMenuStyle({ borderRadius: 16, padding: 5 }, style)}
      transition={transition ?? "100ms"}
    />
  );
}

function ContextMenuGroup(props: ContextMenuGroupProps) {
  return <TamaguiContextMenu.Group {...props} />;
}

function ContextMenuLabel(props: ContextMenuLabelProps) {
  const { style, ...labelProps } = props;

  return (
    <TamaguiContextMenu.Label
      {...labelProps}
      color={props.color ?? "$color9"}
      select={props.select ?? "none"}
      size={props.size ?? "$3"}
      style={mergeContextMenuStyle({ padding: 5 }, style)}
    />
  );
}

function ContextMenuItem(props: ContextMenuItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiContextMenu.Item {...itemProps} textValue={textValue ?? getChildrenTextValue(children)}>
      {normalizeContextMenuChildren(children)}
    </TamaguiContextMenu.Item>
  );
}

function ContextMenuItemTitle(props: ContextMenuItemTitleProps) {
  return <TamaguiContextMenu.ItemTitle {...props} />;
}

function ContextMenuItemSubtitle(props: ContextMenuItemSubtitleProps) {
  return <TamaguiContextMenu.ItemSubtitle {...props} />;
}

function ContextMenuItemIcon(props: ContextMenuItemIconProps) {
  return <TamaguiContextMenu.ItemIcon {...props} />;
}

function ContextMenuItemImage(props: ContextMenuItemImageProps) {
  return <TamaguiContextMenu.ItemImage {...props} />;
}

function ContextMenuCheckboxItem(props: ContextMenuCheckboxItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiContextMenu.CheckboxItem
      {...itemProps}
      textValue={textValue ?? getChildrenTextValue(children)}
    >
      {normalizeContextMenuChildren(children)}
    </TamaguiContextMenu.CheckboxItem>
  );
}

function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  return <TamaguiContextMenu.RadioGroup {...props} />;
}

function ContextMenuRadioItem(props: ContextMenuRadioItemProps) {
  const { children, textValue, ...itemProps } = props;

  return (
    <TamaguiContextMenu.RadioItem
      {...itemProps}
      textValue={textValue ?? getChildrenTextValue(children)}
    >
      {normalizeContextMenuChildren(children)}
    </TamaguiContextMenu.RadioItem>
  );
}

function ContextMenuItemIndicator(props: ContextMenuItemIndicatorProps) {
  return <TamaguiContextMenu.ItemIndicator {...props} />;
}

function ContextMenuSeparator(props: ContextMenuSeparatorProps) {
  return <TamaguiContextMenu.Separator {...props} />;
}

function ContextMenuArrow(props: ContextMenuArrowProps) {
  return (
    <TamaguiContextMenu.Arrow
      {...props}
      borderColor={props.borderColor ?? "$borderColor"}
      borderWidth={props.borderWidth ?? 1}
      size={props.size ?? "$4"}
    />
  );
}

function ContextMenuSub(props: ContextMenuSubProps) {
  return <TamaguiContextMenu.Sub {...props} />;
}

function ContextMenuSubTrigger(props: ContextMenuSubTriggerProps) {
  const { children, textValue, ...subTriggerProps } = props;

  return (
    <TamaguiContextMenu.SubTrigger
      {...subTriggerProps}
      textValue={textValue ?? getChildrenTextValue(children)}
    >
      {normalizeContextMenuChildren(children)}
    </TamaguiContextMenu.SubTrigger>
  );
}

function ContextMenuSubContent(props: ContextMenuSubContentProps) {
  const { boxShadow, enterStyle, exitStyle, style, transition, ...contentProps } = props;

  return (
    <TamaguiContextMenu.SubContent
      {...contentProps}
      boxShadow={boxShadow ?? "0 4px 5px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_CONTEXT_MENU_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_CONTEXT_MENU_EXIT_STYLE}
      style={mergeContextMenuStyle({ borderRadius: 16, padding: 5 }, style)}
      transition={transition ?? "100ms"}
    />
  );
}

function ContextMenuPreview(props: ContextMenuPreviewProps) {
  return <TamaguiContextMenu.Preview {...props} />;
}

ContextMenuRoot.displayName = "ContextMenu";
ContextMenuTrigger.displayName = "Trigger";
ContextMenuPortal.displayName = "Portal";
ContextMenuContent.displayName = "Content";
ContextMenuGroup.displayName = "Group";
ContextMenuLabel.displayName = "Label";
ContextMenuItem.displayName = "Item";
ContextMenuItemTitle.displayName = "ItemTitle";
ContextMenuItemSubtitle.displayName = "ItemSubtitle";
ContextMenuItemIcon.displayName = "ItemIcon";
ContextMenuItemImage.displayName = "ItemImage";
ContextMenuCheckboxItem.displayName = "CheckboxItem";
ContextMenuRadioGroup.displayName = "RadioGroup";
ContextMenuRadioItem.displayName = "RadioItem";
ContextMenuItemIndicator.displayName = "ItemIndicator";
ContextMenuSeparator.displayName = "Separator";
ContextMenuArrow.displayName = "Arrow";
ContextMenuSub.displayName = "Sub";
ContextMenuSubTrigger.displayName = "SubTrigger";
ContextMenuSubContent.displayName = "SubContent";
ContextMenuPreview.displayName = "Preview";

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Portal: ContextMenuPortal,
  Content: ContextMenuContent,
  Group: ContextMenuGroup,
  Label: ContextMenuLabel,
  Item: ContextMenuItem,
  ItemTitle: ContextMenuItemTitle,
  ItemSubtitle: ContextMenuItemSubtitle,
  ItemIcon: ContextMenuItemIcon,
  ItemImage: ContextMenuItemImage,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  ItemIndicator: ContextMenuItemIndicator,
  Separator: ContextMenuSeparator,
  Arrow: ContextMenuArrow,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
  Preview: ContextMenuPreview,
});
