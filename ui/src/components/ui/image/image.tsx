import { Image as TamaguiImage, createImage } from "tamagui";

import type { ImageProps } from "./types";

export function Image(props: ImageProps) {
  return <TamaguiImage {...props} />;
}

export { createImage };
