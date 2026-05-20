import { TagGroup as HeroUITagGroup } from "heroui-native";

import type { TagGroupListProps, TagGroupProps } from "./types";

function TagGroupRoot({
  children,
  className,
  nativeProps,
  size,
  variant,
  webProps,
}: TagGroupProps) {
  void webProps;
  return (
    <HeroUITagGroup className={className} size={size} variant={variant} {...(nativeProps as any)}>
      {children}
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

export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
});
