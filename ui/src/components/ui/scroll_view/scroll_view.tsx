import { forwardRef } from "react";
import { ScrollView as ReactNativeScrollView } from "react-native";
import { ScrollView as TamaguiScrollView } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { ScrollViewProps } from "./types";

export const ScrollView = forwardRef<any, ScrollViewProps>((props, ref) => {
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
  void bottomSheetScrollable;

  return (
    <ReactNativeScrollView
      ref={ref}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      {...(restProps as any)}
    />
  );
});
