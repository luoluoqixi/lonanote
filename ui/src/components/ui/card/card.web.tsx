import { Card as HeroUICard } from "@heroui/react";

import type {
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from "./types";

export function Card({ children, className, nativeProps, webProps }: CardProps) {
  void nativeProps;
  return (
    <HeroUICard className={className} {...(webProps as any)}>
      {children}
    </HeroUICard>
  );
}

export function CardHeader({ className, nativeProps, webProps }: CardHeaderProps) {
  void nativeProps;
  return <HeroUICard.Header className={className} {...(webProps as any)} />;
}

export function CardTitle({ children, className, nativeProps, webProps }: CardTitleProps) {
  void nativeProps;
  return (
    <HeroUICard.Title className={className} {...(webProps as any)}>
      {children}
    </HeroUICard.Title>
  );
}

export function CardDescription({
  children,
  className,
  nativeProps,
  webProps,
}: CardDescriptionProps) {
  void nativeProps;
  return (
    <HeroUICard.Description className={className} {...(webProps as any)}>
      {children}
    </HeroUICard.Description>
  );
}

export function CardBody({ children, className, nativeProps, webProps }: CardBodyProps) {
  void nativeProps;
  return (
    <HeroUICard.Content className={className} {...(webProps as any)}>
      {children}
    </HeroUICard.Content>
  );
}

export function CardFooter({ className, nativeProps, webProps }: CardFooterProps) {
  void nativeProps;
  return <HeroUICard.Footer className={className} {...(webProps as any)} />;
}
