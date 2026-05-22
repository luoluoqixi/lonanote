import clsx from "clsx";
import { TagGroup as HeroUITagGroup } from "heroui-native";

import type { TagGroupItemProps, TagGroupListProps, TagGroupProps } from "./types";

function TagGroupRoot({
  accessibilityLabel,
  children,
  className,
  itemClassName,
  items,
  listClassName,
  nativeProps,
  size,
  variant,
  webProps,
}: TagGroupProps) {
  void webProps;

  const content = children ?? (
    <HeroUITagGroup.List className={listClassName}>
      {items?.map((item) => (
        <HeroUITagGroup.Item
          className={clsx(itemClassName, item.className)}
          id={item.key}
          key={item.key}
        >
          {item.label}
        </HeroUITagGroup.Item>
      ))}
    </HeroUITagGroup.List>
  );

  return (
    <HeroUITagGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      size={size}
      variant={variant}
      {...(nativeProps as any)}
    >
      {content}
    </HeroUITagGroup>
  );
}

function TagGroupList({ children, className, nativeProps, webProps }: TagGroupListProps) {
  void webProps;
  return (
    <HeroUITagGroup.List className={className} {...(nativeProps as any)}>
      {children}
    </HeroUITagGroup.List>
  );
}

function TagGroupItem({ children, className, nativeProps, webProps }: TagGroupItemProps) {
  void webProps;
  return (
    <HeroUITagGroup.Item className={className} {...(nativeProps as any)}>
      {children}
    </HeroUITagGroup.Item>
  );
}

export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
  Item: TagGroupItem,
});
