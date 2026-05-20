import type { RadioGroupRootProps as WebRadioGroupRootProps } from "@heroui/react";
import type { RadioGroupProps as NativeRadioGroupProps } from "heroui-native";
import type { ReactNode } from "react";

type RadioGroupPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface RadioGroupProps extends RadioGroupPlatformProps<
  WebRadioGroupRootProps,
  NativeRadioGroupProps
> {
  children?: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}
