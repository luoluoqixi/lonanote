import type { AlertRootProps as NativeAlertRootProps } from "heroui-native";
import type { ReactNode } from "react";

export type AlertStatus = NativeAlertRootProps["status"];

export interface AlertProps {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  indicator?: ReactNode;
  indicatorClassName?: string;
  status?: AlertStatus;
  title?: ReactNode;
  titleClassName?: string;
}

export interface AlertIndicatorProps {
  children?: ReactNode;
  className?: string;
}

export interface AlertContentProps {
  children?: ReactNode;
  className?: string;
}

export interface AlertTitleProps {
  children?: ReactNode;
  className?: string;
}

export interface AlertDescriptionProps {
  children?: ReactNode;
  className?: string;
}
