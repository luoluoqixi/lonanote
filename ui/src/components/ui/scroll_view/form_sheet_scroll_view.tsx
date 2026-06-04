import { forwardRef } from "react";

import { os } from "@/api/common/platform";

import { ScrollView } from "./scroll_view";
import type { ScrollViewProps } from "./types";

/**
 * Native Stack formSheet / 可滚动调试分区用 ScrollView。
 * Android formSheet 默认关闭 nested scroll，便于 sheet 与整页滚动协调；调用方可显式覆盖。
 */
export const FormSheetScrollView = forwardRef<any, ScrollViewProps>(function FormSheetScrollView(
  { nestedScrollEnabled, ...props },
  ref,
) {
  const resolvedNested = nestedScrollEnabled ?? os() !== "android";

  return <ScrollView ref={ref} nestedScrollEnabled={resolvedNested} {...props} />;
});
