import {
  H1 as TamaguiH1,
  H2 as TamaguiH2,
  H3 as TamaguiH3,
  H4 as TamaguiH4,
  H5 as TamaguiH5,
  H6 as TamaguiH6,
  Paragraph as TamaguiParagraph,
  SizableText as TamaguiSizableText,
  Text as TamaguiText,
} from "tamagui";

import type { HeadingProps, ParagraphProps, SizableTextProps, TextProps } from "./types";

export function Text(props: TextProps) {
  return <TamaguiText {...props} />;
}

export function SizableText(props: SizableTextProps) {
  return <TamaguiSizableText {...props} />;
}

export function Paragraph(props: ParagraphProps) {
  return <TamaguiParagraph {...props} />;
}

export function H1(props: HeadingProps) {
  return <TamaguiH1 {...props} />;
}

export function H2(props: HeadingProps) {
  return <TamaguiH2 {...props} />;
}

export function H3(props: HeadingProps) {
  return <TamaguiH3 {...props} />;
}

export function H4(props: HeadingProps) {
  return <TamaguiH4 {...props} />;
}

export function H5(props: HeadingProps) {
  return <TamaguiH5 {...props} />;
}

export function H6(props: HeadingProps) {
  return <TamaguiH6 {...props} />;
}
