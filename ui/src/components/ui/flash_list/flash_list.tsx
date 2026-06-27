import { useBottomSheetScrollableCreator } from "@gorhom/bottom-sheet";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { type ReactElement, type Ref, forwardRef } from "react";

import { isWeb } from "@/api/common/platform";
import { useBottomSheetScrollableContext } from "@/components/ui/sheet/native_sheet/bottom_sheet/scrollable_context";

import type { FlashListProps, FlashListRef } from "./types";

function FlashListInner<TItem>(props: FlashListProps<TItem>, ref: Ref<FlashListRef<TItem>>) {
  const insideBottomSheetScrollable = useBottomSheetScrollableContext();
  const renderScrollComponent = useBottomSheetScrollableCreator();

  return (
    <ShopifyFlashList
      ref={ref}
      renderScrollComponent={
        insideBottomSheetScrollable && !isWeb() ? (renderScrollComponent as any) : undefined
      }
      {...props}
    />
  );
}

export const FlashList = forwardRef(FlashListInner) as <TItem>(
  props: FlashListProps<TItem> & { ref?: Ref<FlashListRef<TItem>> },
) => ReactElement;
