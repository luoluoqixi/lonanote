import { Anchor as TamaguiAnchor } from "tamagui";

import type { LinkProps } from "./types";

export function Link(props: LinkProps) {
  return <TamaguiAnchor {...props} />;
}
