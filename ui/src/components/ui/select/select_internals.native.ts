import type React from "react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Tamagui 内部 dist 模块当前没有对外声明文件。
import {
  SelectZIndexContext as selectZIndexContextInternal,
  useSelectContext as useSelectContextInternal,
  useSelectItemParentContext as useSelectItemParentContextInternal,
  // @ts-ignore
} from "../../../../node_modules/@tamagui/select/dist/esm/context.native.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Tamagui 内部 dist 模块当前没有对外声明文件。
import { useShowSelectSheet as useShowSelectSheetInternal } from "../../../../node_modules/@tamagui/select/dist/esm/useSelectBreakpointActive.native.js";

export const SelectZIndexContext = selectZIndexContextInternal as React.Context<number | undefined>;
export const useSelectContext = useSelectContextInternal as (scope?: string) => any;
export const useSelectItemParentContext = useSelectItemParentContextInternal as (
  scope?: string,
) => any;
export const useShowSelectSheet = useShowSelectSheetInternal as (context: {
  adaptScope: string;
  open: boolean;
}) => boolean;
