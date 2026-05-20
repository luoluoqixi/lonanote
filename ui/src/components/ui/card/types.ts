import type { ReactNode } from "react";

export type CardVariant = "default" | "outlined" | "elevated";

export interface CardProps {
  children?: ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  className?: string;
}

export interface CardBodyProps {
  children?: ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children?: ReactNode;
  className?: string;
}

export interface CardDescriptionProps {
  children?: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  className?: string;
}
