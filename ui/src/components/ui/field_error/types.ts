import { FieldError as WebFieldError } from "@heroui/react";
import { FieldError as NativeFieldError } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type FieldErrorPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeFieldError>,
    "children" | "className" | "isInvalid"
  >;
  webProps?: Omit<ComponentProps<typeof WebFieldError>, "children" | "className">;
};

export interface FieldErrorProps extends FieldErrorPlatformProps {
  children?: ReactNode;
  className?: string;
  isInvalid?: boolean;
}
