import clsx from "clsx";
import { TagGroup as HeroUITagGroup } from "heroui-native";

import type { TagGroupItemProps, TagGroupListProps, TagGroupProps } from "./types";

function TagGroupRoot({
  accessibilityLabel,
  children,
  className,
  defaultSelectedKeys,
  itemClassName,
  items,
  listClassName,
  selectionMode,
  size,
  variant,
}: TagGroupProps) {
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
      defaultSelectedKeys={defaultSelectedKeys}
      selectionMode={selectionMode}
      size={size}
      variant={variant}
    >
      {content}
    </HeroUITagGroup>
  );
}

function TagGroupList({ children, className }: TagGroupListProps) {
  return <HeroUITagGroup.List className={className}>{children}</HeroUITagGroup.List>;
}

function TagGroupItem({ children, className, id }: TagGroupItemProps) {
  return (
    <HeroUITagGroup.Item className={className} id={id}>
      {children}
    </HeroUITagGroup.Item>
  );
}

export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
  Item: TagGroupItem,
});
