import { Dropdown as WebDropdown } from "@heroui/react";
import { Menu as NativeMenu } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type DropdownRootPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeMenu>,
    "children" | "className" | "isDefaultOpen" | "isOpen" | "onOpenChange"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebDropdown>,
    "children" | "className" | "defaultOpen" | "isOpen" | "onOpenChange"
  >;
};

type DropdownTriggerPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeMenu.Trigger>,
    "children" | "className" | "isDisabled"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebDropdown.Trigger>,
    "children" | "className" | "isDisabled"
  >;
};

type DropdownPopoverPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeMenu.Portal>, "children">;
  webProps?: Omit<ComponentProps<typeof WebDropdown.Popover>, "children" | "className">;
};

type DropdownMenuPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeMenu.Content>, "children" | "className">;
  webProps?: Omit<ComponentProps<typeof WebDropdown.Menu>, "children" | "className">;
};

type DropdownSectionPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeMenu.Group>, "children" | "className">;
  webProps?: Omit<ComponentProps<typeof WebDropdown.Section>, "children" | "className">;
};

type DropdownItemPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeMenu.Item>,
    "children" | "className" | "isDisabled"
  >;
  webProps?: Omit<ComponentProps<typeof WebDropdown.Item>, "children" | "className" | "isDisabled">;
};

type DropdownItemIndicatorPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeMenu.ItemIndicator>, "className">;
  webProps?: Omit<ComponentProps<typeof WebDropdown.ItemIndicator>, "className">;
};

export interface DropdownItemData extends DropdownItemPlatformProps {
  className?: string;
  isDisabled?: boolean;
  key: string;
  label: ReactNode;
  textValue?: string;
}

export interface DropdownProps extends DropdownRootPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  isDefaultOpen?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  itemClassName?: string;
  items?: DropdownItemData[];
  onAction?: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  triggerClassName?: string;
}

export interface DropdownTriggerProps extends DropdownTriggerPlatformProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
}

export interface DropdownPopoverProps extends DropdownPopoverPlatformProps {
  children?: ReactNode;
  className?: string;
}

export interface DropdownMenuProps extends DropdownMenuPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  onAction?: (key: string) => void;
}

export interface DropdownSectionProps extends DropdownSectionPlatformProps {
  children?: ReactNode;
  className?: string;
}

export interface DropdownItemProps extends DropdownItemPlatformProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  textValue?: string;
}

export interface DropdownItemIndicatorProps extends DropdownItemIndicatorPlatformProps {
  className?: string;
}
