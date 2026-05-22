import { Alert as HeroUIAlert } from "@heroui/react";

import type {
  AlertContentProps,
  AlertDescriptionProps,
  AlertIndicatorProps,
  AlertProps,
  AlertTitleProps,
} from "./types";

function AlertRoot({
  children,
  className,
  contentClassName,
  description,
  descriptionClassName,
  indicator,
  indicatorClassName,
  nativeProps,
  status,
  title,
  titleClassName,
  webProps,
}: AlertProps) {
  void nativeProps;

  const content = children ?? (
    <>
      {indicator == null ? null : (
        <HeroUIAlert.Indicator className={indicatorClassName}>{indicator}</HeroUIAlert.Indicator>
      )}
      <HeroUIAlert.Content className={contentClassName}>
        {title == null ? null : (
          <HeroUIAlert.Title className={titleClassName}>{title}</HeroUIAlert.Title>
        )}
        {description == null ? null : (
          <HeroUIAlert.Description className={descriptionClassName}>
            {description}
          </HeroUIAlert.Description>
        )}
      </HeroUIAlert.Content>
    </>
  );

  return (
    <HeroUIAlert className={className} status={status} {...(webProps as any)}>
      {content}
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
