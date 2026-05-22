import { Alert as HeroUIAlert } from "heroui-native";

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
  void webProps;

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
    <HeroUIAlert className={className} status={status} {...(nativeProps as any)}>
      {content}
    </HeroUIAlert>
  );
}

function AlertIndicator({ children, className, nativeProps, webProps }: AlertIndicatorProps) {
  void webProps;
  return (
    <HeroUIAlert.Indicator className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAlert.Indicator>
  );
}

function AlertContent({ children, className, nativeProps, webProps }: AlertContentProps) {
  void webProps;
  return (
    <HeroUIAlert.Content className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAlert.Content>
  );
}

function AlertTitle({ children, className, nativeProps, webProps }: AlertTitleProps) {
  void webProps;
  return (
    <HeroUIAlert.Title className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAlert.Title>
  );
}

function AlertDescription({ children, className, nativeProps, webProps }: AlertDescriptionProps) {
  void webProps;
  return (
    <HeroUIAlert.Description className={className} {...(nativeProps as any)}>
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
