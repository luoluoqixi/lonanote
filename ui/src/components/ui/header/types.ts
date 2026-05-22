import { Header as WebHeader } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";
import type { TextProps as NativeTextProps } from "react-native";

type HeaderPlatformProps = {
  nativeProps?: Omit<NativeTextProps, "children" | "className">;
  webProps?: Omit<ComponentProps<typeof WebHeader>, "children" | "className">;
};

export interface HeaderProps extends HeaderPlatformProps {
  children?: ReactNode;
  className?: string;
}
