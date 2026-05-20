import { Spinner as WebSpinner } from "@heroui/react";
import { Spinner as NativeSpinner } from "heroui-native";
import type { ComponentProps } from "react";

export type SpinnerColor = "primary" | "secondary" | "success" | "warning" | "danger";
export type SpinnerSize = "sm" | "md" | "lg";

type SpinnerPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeSpinner>, "className" | "size">;
  webProps?: Omit<ComponentProps<typeof WebSpinner>, "className" | "size">;
};

export interface SpinnerProps extends SpinnerPlatformProps {
  className?: string;
  size?: SpinnerSize;
}
