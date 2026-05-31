import { forwardRef } from "react";
import { ScrollView as ReactNativeScrollView } from "react-native";
import { ScrollView as TamaguiScrollView } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { ScrollViewProps } from "./types";

export const ScrollView = forwardRef<any, ScrollViewProps>((props, ref) => {
  if (isWeb()) {
    return <TamaguiScrollView ref={ref} {...props} />;
  }

  const { nestedScrollEnabled, ...restProps } = props as ScrollViewProps & {
    nestedScrollEnabled?: boolean;
  };

  return (
    <ReactNativeScrollView
      ref={ref}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      {...(restProps as any)}
    />
  );
});
