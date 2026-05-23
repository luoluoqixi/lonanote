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
  status,
  title,
  titleClassName,
}: AlertProps) {
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
    <HeroUIAlert className={className} status={status}>
      {content}
    </HeroUIAlert>
  );
}

function AlertIndicator({ children, className }: AlertIndicatorProps) {
  return <HeroUIAlert.Indicator className={className}>{children}</HeroUIAlert.Indicator>;
}

function AlertContent({ children, className }: AlertContentProps) {
  return <HeroUIAlert.Content className={className}>{children}</HeroUIAlert.Content>;
}

function AlertTitle({ children, className }: AlertTitleProps) {
  return <HeroUIAlert.Title className={className}>{children}</HeroUIAlert.Title>;
}

function AlertDescription({ children, className }: AlertDescriptionProps) {
  return <HeroUIAlert.Description className={className}>{children}</HeroUIAlert.Description>;
}

export const Alert = Object.assign(AlertRoot, {
  Root: AlertRoot,
  Indicator: AlertIndicator,
  Content: AlertContent,
  Title: AlertTitle,
  Description: AlertDescription,
});
