import type {
  PopoverArrowProps as WebPopoverArrowProps,
  PopoverContentProps as WebPopoverContentProps,
  PopoverHeadingProps as WebPopoverHeadingProps,
  PopoverRootProps as WebPopoverRootProps,
  PopoverTriggerProps as WebPopoverTriggerProps,
} from "@heroui/react";
import type {
  PopoverArrowProps as NativePopoverArrowProps,
  PopoverContentProps as NativePopoverContentProps,
  PopoverRootProps as NativePopoverRootProps,
  PopoverTitleProps as NativePopoverTitleProps,
  PopoverTriggerProps as NativePopoverTriggerProps,
} from "heroui-native";
import type { ReactNode } from "react";

type PopoverPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface PopoverProps extends PopoverPlatformProps<
  WebPopoverRootProps,
  NativePopoverRootProps
> {
  children?: ReactNode;
}

export interface PopoverTriggerProps extends PopoverPlatformProps<
  WebPopoverTriggerProps,
  NativePopoverTriggerProps
> {
  children?: ReactNode;
  className?: string;
}

export interface PopoverContentProps extends PopoverPlatformProps<
  WebPopoverContentProps,
  NativePopoverContentProps
> {
  children?: ReactNode;
  className?: string;
}

export interface PopoverArrowProps extends PopoverPlatformProps<
  WebPopoverArrowProps,
  NativePopoverArrowProps
> {
  children?: ReactNode;
  className?: string;
}

export interface PopoverTitleProps extends PopoverPlatformProps<
  WebPopoverHeadingProps,
  NativePopoverTitleProps
> {
  children?: ReactNode;
  className?: string;
}
