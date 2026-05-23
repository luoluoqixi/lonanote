import { Separator as WebSeparator } from "@heroui/react";
import { Separator as NativeSeparator } from "heroui-native";
import type { ComponentProps } from "react";

export type SeparatorOrientation = "horizontal" | "vertical";

type SeparatorPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeSeparator>, "className" | "orientation">;
  webProps?: Omit<ComponentProps<typeof WebSeparator>, "className" | "orientation">;
};

export interface SeparatorProps extends SeparatorPlatformProps {
  className?: string;
  orientation?: SeparatorOrientation;
}
