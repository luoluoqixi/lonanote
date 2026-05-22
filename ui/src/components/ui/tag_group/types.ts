import { Tag as WebTag, TagGroup as WebTagGroup } from "@heroui/react";
import type { TagGroupSize, TagGroupVariant } from "heroui-native";
import { TagGroup as NativeTagGroup } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type TagGroupPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

type TagGroupItemPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface TagGroupItemData {
  className?: string;
  key: string;
  label: ReactNode;
}

export interface TagGroupProps extends TagGroupPlatformProps<
  ComponentProps<typeof WebTagGroup>,
  ComponentProps<typeof NativeTagGroup>
> {
  children?: ReactNode;
  accessibilityLabel?: string;
  className?: string;
  itemClassName?: string;
  items?: TagGroupItemData[];
  listClassName?: string;
  size?: TagGroupSize;
  variant?: TagGroupVariant;
}

export interface TagGroupListProps extends TagGroupPlatformProps<
  ComponentProps<typeof WebTagGroup.List>,
  ComponentProps<typeof NativeTagGroup.List>
> {
  children?: ReactNode;
  className?: string;
}

export interface TagGroupItemProps extends TagGroupItemPlatformProps<
  ComponentProps<typeof WebTag>,
  ComponentProps<typeof NativeTagGroup.Item>
> {
  children?: ReactNode;
  className?: string;
}
