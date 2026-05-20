import { Card as HeroUICard } from "heroui-native";

import type {
  CardBodyProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from "./types";

export function Card({ children, className }: CardProps) {
  return <HeroUICard className={className}>{children}</HeroUICard>;
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <HeroUICard.Header className={className} {...props} />;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <HeroUICard.Title className={className} {...props}>
      {children}
    </HeroUICard.Title>
  );
}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <HeroUICard.Description className={className} {...props}>
      {children}
    </HeroUICard.Description>
  );
}

export function CardBody({ children, className, ...props }: CardBodyProps) {
  return (
    <HeroUICard.Body className={className} {...props}>
      {children}
    </HeroUICard.Body>
  );
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <HeroUICard.Footer className={className} {...props} />;
}
