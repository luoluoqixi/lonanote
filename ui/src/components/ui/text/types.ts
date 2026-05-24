import type { ComponentProps } from "react";
import type {
  H1 as TamaguiH1,
  Paragraph as TamaguiParagraph,
  SizableText as TamaguiSizableText,
  Text as TamaguiText,
} from "tamagui";

export type TextProps = ComponentProps<typeof TamaguiText>;
export type SizableTextProps = ComponentProps<typeof TamaguiSizableText>;
export type ParagraphProps = ComponentProps<typeof TamaguiParagraph>;
export type HeadingProps = ComponentProps<typeof TamaguiH1>;
