import { Stack } from "expo-router";
import type { ComponentProps } from "react";

import { sheetScreenOptions, type SheetPreset } from "./sheet_screen_options";

type StackScreenProps = ComponentProps<typeof Stack.Screen>;

export type SheetStackScreenInput = Omit<StackScreenProps, "options"> & {
  options?: StackScreenProps["options"];
};

/**
 * 生成可直接展开到 `<Stack.Screen />` 的 props。
 * Expo Router 的 Stack 只接受原生 `Stack.Screen` 子节点，不能用自定义包装组件。
 *
 * @example
 * <Stack.Screen {...sheetStackScreen("card", { name: "debug", options: { headerShown: false } })} />
 */
export function sheetStackScreen(
  preset: SheetPreset,
  { options, ...rest }: SheetStackScreenInput,
): StackScreenProps {
  const mergedOptions: StackScreenProps["options"] =
    typeof options === "function"
      ? (route) => ({
          ...sheetScreenOptions(preset),
          ...options(route),
        })
      : {
          ...sheetScreenOptions(preset),
          ...options,
        };

  return {
    ...rest,
    options: mergedOptions,
  };
}
