import type {
  AlertContentProps as WebAlertContentProps,
  AlertDescriptionProps as WebAlertDescriptionProps,
  AlertIndicatorProps as WebAlertIndicatorProps,
  AlertRootProps as WebAlertRootProps,
  AlertTitleProps as WebAlertTitleProps,
} from "@heroui/react";
import type {
  AlertContentProps as NativeAlertContentProps,
  AlertDescriptionProps as NativeAlertDescriptionProps,
  AlertIndicatorProps as NativeAlertIndicatorProps,
  AlertRootProps as NativeAlertRootProps,
  AlertTitleProps as NativeAlertTitleProps,
} from "heroui-native";
import type { ReactNode } from "react";

type AlertPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export type AlertStatus = WebAlertRootProps["status"];

export interface AlertProps extends AlertPlatformProps<WebAlertRootProps, NativeAlertRootProps> {
  children?: ReactNode;
  className?: string;
  status?: AlertStatus;
}

export interface AlertIndicatorProps extends AlertPlatformProps<
  WebAlertIndicatorProps,
  NativeAlertIndicatorProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AlertContentProps extends AlertPlatformProps<
  WebAlertContentProps,
  NativeAlertContentProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AlertTitleProps extends AlertPlatformProps<
  WebAlertTitleProps,
  NativeAlertTitleProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AlertDescriptionProps extends AlertPlatformProps<
  WebAlertDescriptionProps,
  NativeAlertDescriptionProps
> {
  children?: ReactNode;
  className?: string;
}
