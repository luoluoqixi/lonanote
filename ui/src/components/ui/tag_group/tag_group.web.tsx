import { TagGroup as HeroUITagGroup } from "@heroui/react";

import type { TagGroupListProps, TagGroupProps } from "./types";

function TagGroupRoot({
  children,
  className,
  nativeProps,
  size,
  variant,
  webProps,
}: TagGroupProps) {
  void nativeProps;
  return (
    <HeroUITagGroup className={className} size={size} variant={variant} {...(webProps as any)}>
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

export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
});
