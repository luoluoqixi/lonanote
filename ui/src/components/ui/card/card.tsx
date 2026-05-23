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

export function CardHeader({ className }: CardHeaderProps) {
  return <HeroUICard.Header className={className} />;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <HeroUICard.Title className={className}>{children}</HeroUICard.Title>;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return <HeroUICard.Description className={className}>{children}</HeroUICard.Description>;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <HeroUICard.Body className={className}>{children}</HeroUICard.Body>;
}

export function CardFooter({ className }: CardFooterProps) {
  return <HeroUICard.Footer className={className} />;
}
