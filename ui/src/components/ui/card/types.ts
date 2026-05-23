import { Card as WebCard } from "@heroui/react";
import { Card as NativeCard } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

export type CardVariant = "default" | "outlined" | "elevated";

type CardPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface CardProps extends CardPlatformProps<
  ComponentProps<typeof WebCard>,
  ComponentProps<typeof NativeCard>
> {
  children?: ReactNode;
  className?: string;
}

export interface CardHeaderProps extends CardPlatformProps<
  ComponentProps<typeof WebCard.Header>,
  ComponentProps<typeof NativeCard.Header>
> {
  className?: string;
}

export interface CardBodyProps extends CardPlatformProps<
  ComponentProps<typeof WebCard.Content>,
  ComponentProps<typeof NativeCard.Body>
> {
  children?: ReactNode;
  className?: string;
}

export interface CardTitleProps extends CardPlatformProps<
  ComponentProps<typeof WebCard.Title>,
  ComponentProps<typeof NativeCard.Title>
> {
  children?: ReactNode;
  className?: string;
}

export interface CardDescriptionProps extends CardPlatformProps<
  ComponentProps<typeof WebCard.Description>,
  ComponentProps<typeof NativeCard.Description>
> {
  children?: ReactNode;
  className?: string;
}

export interface CardFooterProps extends CardPlatformProps<
  ComponentProps<typeof WebCard.Footer>,
  ComponentProps<typeof NativeCard.Footer>
> {
  className?: string;
}
