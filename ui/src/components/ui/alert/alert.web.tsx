import { Alert as HeroUIAlert } from "@heroui/react";

import type {
  AlertContentProps,
  AlertDescriptionProps,
  AlertIndicatorProps,
  AlertProps,
  AlertTitleProps,
} from "./types";

function AlertRoot({ children, className, nativeProps, status, webProps }: AlertProps) {
  void nativeProps;
  return (
    <HeroUIAlert className={className} status={status} {...(webProps as any)}>
      {children}
    </HeroUIAlert>
  );
}

function AlertIndicator({ children, className, nativeProps, webProps }: AlertIndicatorProps) {
  void nativeProps;
  return (
    <HeroUIAlert.Indicator className={className} {...(webProps as any)}>
      {children}
    </HeroUIAlert.Indicator>
  );
}

function AlertContent({ children, className, nativeProps, webProps }: AlertContentProps) {
  void nativeProps;
  return (
    <HeroUIAlert.Content className={className} {...(webProps as any)}>
      {children}
    </HeroUIAlert.Content>
  );
}

function AlertTitle({ children, className, nativeProps, webProps }: AlertTitleProps) {
  void nativeProps;
  return (
    <HeroUIAlert.Title className={className} {...(webProps as any)}>
      {children}
    </HeroUIAlert.Title>
  );
}

function AlertDescription({ children, className, nativeProps, webProps }: AlertDescriptionProps) {
  void nativeProps;
  return (
    <HeroUIAlert.Description className={className} {...(webProps as any)}>
      {children}
    </HeroUIAlert.Description>
  );
}

export const Alert = Object.assign(AlertRoot, {
  Root: AlertRoot,
  Indicator: AlertIndicator,
  Content: AlertContent,
  Title: AlertTitle,
  Description: AlertDescription,
});
