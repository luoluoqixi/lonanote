import type { TypographyRootProps as WebTypographyRootProps } from "@heroui/react";
import type { ReactNode } from "react";
import type { TextProps as NativeTextProps } from "react-native";

type TextPlatformProps = {
  nativeProps?: Omit<NativeTextProps, "children" | "className">;
  webProps?: Omit<WebTypographyRootProps, "children" | "className">;
};

export interface TextProps extends TextPlatformProps {
  children?: ReactNode;
  className?: string;
}
