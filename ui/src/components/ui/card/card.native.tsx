import { Card as HeroUICard } from "heroui-native";

import type {
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from "./types";

export function Card({ children, className, nativeProps, webProps }: CardProps) {
  void webProps;
  return (
    <HeroUICard className={className} {...(nativeProps as any)}>
      {children}
    </HeroUICard>
  );
}

export function CardHeader({ className, nativeProps, webProps }: CardHeaderProps) {
  void webProps;
  return <HeroUICard.Header className={className} {...(nativeProps as any)} />;
}

export function CardTitle({ children, className, nativeProps, webProps }: CardTitleProps) {
  void webProps;
  return (
    <HeroUICard.Title className={className} {...(nativeProps as any)}>
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
  void webProps;
  return (
    <HeroUICard.Description className={className} {...(nativeProps as any)}>
      {children}
    </HeroUICard.Description>
  );
}

export function CardBody({ children, className, nativeProps, webProps }: CardBodyProps) {
  void webProps;
  return (
    <HeroUICard.Body className={className} {...(nativeProps as any)}>
      {children}
    </HeroUICard.Body>
  );
}

export function CardFooter({ className, nativeProps, webProps }: CardFooterProps) {
  void webProps;
  return <HeroUICard.Footer className={className} {...(nativeProps as any)} />;
}
