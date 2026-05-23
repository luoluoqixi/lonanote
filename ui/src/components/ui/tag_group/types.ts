import type { TagGroupSize, TagGroupVariant } from "heroui-native";
import type { ReactNode } from "react";

export interface TagGroupItemData {
  className?: string;
  key: string;
  label: ReactNode;
}

export interface TagGroupProps {
  accessibilityLabel?: string;
  className?: string;
  children?: ReactNode;
  defaultSelectedKeys?: Iterable<string>;
  itemClassName?: string;
  items?: TagGroupItemData[];
  listClassName?: string;
  selectionMode?: "none" | "single" | "multiple";
  size?: TagGroupSize;
  variant?: TagGroupVariant;
}

export interface TagGroupListProps {
  children?: ReactNode;
  className?: string;
}

export interface TagGroupItemProps {
  children?: ReactNode;
  className?: string;
  id: string;
}
