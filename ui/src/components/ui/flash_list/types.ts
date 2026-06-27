import type {
  ListRenderItem,
  ListRenderItemInfo,
  FlashListProps as ShopifyFlashListProps,
  FlashListRef as ShopifyFlashListRef,
} from "@shopify/flash-list";

export type FlashListProps<TItem> = ShopifyFlashListProps<TItem>;
export type FlashListRef<TItem> = ShopifyFlashListRef<TItem>;
export type { ListRenderItem, ListRenderItemInfo };
