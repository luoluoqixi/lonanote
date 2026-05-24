import { H2, Paragraph, Card as TamaguiCard, View } from "tamagui";

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
    contentProps,
    title,
    ...rootProps
  } = props;
  const hasHeader = header != null || title != null || description != null;

  return (
    <TamaguiCard size="$4" borderWidth={1} borderColor="$borderColor" {...rootProps}>
      {hasHeader ? (
        <CardHeader p="$4" {...headerProps}>
          {header ?? (
            <>
              {title != null ? <H2 fontWeight="600">{title}</H2> : null}
              {description != null ? <Paragraph color="$color10">{description}</Paragraph> : null}
            </>
          )}
        </CardHeader>
      ) : null}
      <View px="$4" pb="$4" {...contentProps}>
        {children}
      </View>
      {footer != null ? (
        <CardFooter p="$4" {...footerProps}>
          {footer}
        </CardFooter>
      ) : null}
      {backgroundContent != null ? (
        <CardBackground items="center" {...backgroundProps}>
          {backgroundContent}
        </CardBackground>
      ) : null}
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
