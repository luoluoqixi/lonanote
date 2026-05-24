import { Anchor as TamaguiAnchor } from "tamagui";

import type { AnchorProps } from "./types";

export function Anchor(props: AnchorProps) {
  return <TamaguiAnchor {...props} />;
}
