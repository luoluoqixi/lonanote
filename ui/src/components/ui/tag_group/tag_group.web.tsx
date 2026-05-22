import { Tag as HeroUITag, TagGroup as HeroUITagGroup } from "@heroui/react";

import type { TagGroupItemProps, TagGroupListProps, TagGroupProps } from "./types";

function TagGroupRoot({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  size,
  variant,
  webProps,
}: TagGroupProps) {
  void nativeProps;
  return (
    <HeroUITagGroup
      aria-label={accessibilityLabel}
      className={className}
      size={size}
      variant={variant}
      {...(webProps as any)}
    >
      {children}
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
