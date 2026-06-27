import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef } from "react";
import { ScrollView as ReactNativeScrollView } from "react-native";
import { ScrollView as TamaguiScrollView } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { useBottomSheetScrollableContext } from "@/components/ui/sheet/native_sheet/bottom_sheet/scrollable_context";

import type { ScrollViewProps } from "./types";

export const ScrollView = forwardRef<any, ScrollViewProps>((props, ref) => {
  const insideBottomSheetScrollable = useBottomSheetScrollableContext();

  if (isWeb()) {
    const { bottomSheetScrollable: _bottomSheetScrollable, ...webProps } = props;
    void _bottomSheetScrollable;
    return <TamaguiScrollView ref={ref} {...webProps} />;
  }

  const {
    bottomSheetScrollable = true,
    nestedScrollEnabled,
    ...restProps
  } = props as ScrollViewProps & {
    nestedScrollEnabled?: boolean;
  };

  if (insideBottomSheetScrollable && bottomSheetScrollable) {
    return <BottomSheetScrollView ref={ref} {...(restProps as any)} />;
  }

  return (
    <ReactNativeScrollView
      ref={ref}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      {...(restProps as any)}
    />
  );
});
