import { Paragraph, SizableText, Card as TamaguiCard, YStack } from "tamagui";

import type { CardBackgroundProps, CardFooterProps, CardHeaderProps, CardProps } from "./types";

function CardRoot(props: CardProps) {
  const {
    backgroundContent,
    backgroundProps,
    children,
    description,
    footer,
    footerProps,
    header,
    headerProps,
    title,
    ...rootProps
  } = props;
  const hasHeader = header != null || title != null || description != null;

  return (
    <TamaguiCard {...rootProps}>
      {backgroundContent != null ? (
        <CardBackground {...backgroundProps}>{backgroundContent}</CardBackground>
      ) : null}
      {hasHeader ? (
        <CardHeader {...headerProps}>
          {header ?? (
            <YStack gap="$1">
              {title != null ? <SizableText fontWeight="600">{title}</SizableText> : null}
              {description != null ? <Paragraph color="$color10">{description}</Paragraph> : null}
            </YStack>
          )}
        </CardHeader>
      ) : null}
      {children}
      {footer != null ? <CardFooter {...footerProps}>{footer}</CardFooter> : null}
    </TamaguiCard>
  );
}

function CardHeader(props: CardHeaderProps) {
  return <TamaguiCard.Header {...props} />;
}

function CardFooter(props: CardFooterProps) {
  return <TamaguiCard.Footer {...props} />;
}

function CardBackground(props: CardBackgroundProps) {
  return <TamaguiCard.Background {...props} />;
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Footer: CardFooter,
  Background: CardBackground,
});
