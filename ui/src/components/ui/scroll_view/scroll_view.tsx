import { ScrollView as TamaguiScrollView } from "tamagui";

import type { ScrollViewProps } from "./types";

export function ScrollView(props: ScrollViewProps) {
  return <TamaguiScrollView {...props} />;
}