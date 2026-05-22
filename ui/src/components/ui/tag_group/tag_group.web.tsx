import { Tag as HeroUITag, TagGroup as HeroUITagGroup } from "@heroui/react";
import clsx from "clsx";

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
  void nativeProps;

  const content = children ?? (
    <HeroUITagGroup.List className={listClassName}>
      {items?.map((item) => (
        <HeroUITag className={clsx(itemClassName, item.className)} id={item.key} key={item.key}>
          {item.label}
        </HeroUITag>
      ))}
    </HeroUITagGroup.List>
  );

  return (
    <HeroUITagGroup
      aria-label={accessibilityLabel}
      className={className}
      size={size}
      variant={variant}
      {...(webProps as any)}
    >
      {content}
    </HeroUITagGroup>
  );
}

function TagGroupList({ children, className, nativeProps, webProps }: TagGroupListProps) {
  void nativeProps;
  return (
    <HeroUITagGroup.List className={className} {...(webProps as any)}>
      {children}
    </HeroUITagGroup.List>
  );
}

function TagGroupItem({ children, className, nativeProps, webProps }: TagGroupItemProps) {
  void nativeProps;
  return (
    <HeroUITag className={className} {...(webProps as any)}>
      {children}
    </HeroUITag>
  );
}

export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
  Item: TagGroupItem,
});
