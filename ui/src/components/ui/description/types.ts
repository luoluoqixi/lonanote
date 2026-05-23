import { Description as WebDescription } from "@heroui/react";
import { Description as NativeDescription } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type DescriptionPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeDescription>,
    "children" | "className" | "hideOnInvalid" | "isDisabled" | "isInvalid"
  >;
  webProps?: Omit<ComponentProps<typeof WebDescription>, "children" | "className">;
};

export interface DescriptionProps extends DescriptionPlatformProps {
  children?: ReactNode;
  className?: string;
  hideOnInvalid?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
}
