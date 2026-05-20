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

export interface DropdownProps extends DropdownRootPlatformProps {
  children?: ReactNode;
  className?: string;
  isDefaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  children?: ReactNode;
  className?: string;
}

export interface DropdownSectionProps extends DropdownSectionPlatformProps {
  children?: ReactNode;
  className?: string;
}

export interface DropdownItemProps extends DropdownItemPlatformProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
}

export interface DropdownItemIndicatorProps extends DropdownItemIndicatorPlatformProps {
  className?: string;
}
