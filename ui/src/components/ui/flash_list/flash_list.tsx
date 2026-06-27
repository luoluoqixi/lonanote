import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { type ReactElement, type Ref, forwardRef } from "react";

import type { FlashListProps, FlashListRef } from "./types";

function FlashListInner<TItem>(props: FlashListProps<TItem>, ref: Ref<FlashListRef<TItem>>) {
  return <ShopifyFlashList ref={ref} {...props} />;
}

export const FlashList = forwardRef(FlashListInner) as <TItem>(
  props: FlashListProps<TItem> & { ref?: Ref<FlashListRef<TItem>> },
) => ReactElement;
