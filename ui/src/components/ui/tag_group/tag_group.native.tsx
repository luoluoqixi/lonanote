import { TagGroup as HeroUITagGroup } from "heroui-native";

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
  void webProps;
  return (
    <HeroUITagGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      size={size}
      variant={variant}
      {...(nativeProps as any)}
    >
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
