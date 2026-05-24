import type { ComponentProps, ReactNode } from "react";
import type { Card as TamaguiCard, View } from "tamagui";

type CardRootProps = Omit<ComponentProps<typeof TamaguiCard>, "background" | "children">;

export interface CardProps extends CardRootProps {
  backgroundContent?: ReactNode;
  backgroundProps?: CardBackgroundProps;
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  footerProps?: CardFooterProps;
  header?: ReactNode;
  headerProps?: CardHeaderProps;
  contentProps?: CardContentProps;
  title?: ReactNode;
}
export type CardHeaderProps = ComponentProps<typeof TamaguiCard.Header>;
export type CardContentProps = ComponentProps<typeof View>;
export type CardFooterProps = ComponentProps<typeof TamaguiCard.Footer>;
export type CardBackgroundProps = ComponentProps<typeof TamaguiCard.Background>;
