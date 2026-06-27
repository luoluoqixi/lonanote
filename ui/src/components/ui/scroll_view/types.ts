import type { ComponentProps } from "react";
import type { ScrollView as TamaguiScrollView } from "tamagui";

export type ScrollViewProps = ComponentProps<typeof TamaguiScrollView> & {
  /** 处于 BottomSheet 内时是否接入 gorhom scrollable 协议。 */
  bottomSheetScrollable?: boolean;
};
