import type {
  RadioGroupRootProps as WebRadioGroupRootProps,
  RadioRootProps as WebRadioProps,
} from "@heroui/react";
import type {
  RadioGroupItemProps as NativeRadioGroupItemProps,
  RadioGroupProps as NativeRadioGroupProps,
} from "heroui-native";
import type { ReactNode } from "react";

type RadioGroupPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

type RadioGroupItemPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className" | "value">;
  webProps?: Omit<TWeb, "children" | "className" | "value">;
};

export interface RadioGroupProps extends RadioGroupPlatformProps<
  WebRadioGroupRootProps,
  NativeRadioGroupProps
> {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  onValueChange?: (nextValue: string) => void;
  value?: string;
  variant?: "primary" | "secondary";
}

export interface RadioGroupItemProps extends RadioGroupItemPlatformProps<
  WebRadioProps,
  NativeRadioGroupItemProps
> {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  value: string;
}
