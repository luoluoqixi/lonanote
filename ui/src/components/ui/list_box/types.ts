import type { ReactNode } from "react";

export interface ListBoxItemData {
  className?: string;
  description?: ReactNode;
  endContent?: ReactNode;
  key: string;
  label: ReactNode;
  startContent?: ReactNode;
  textValue?: string;
  variant?: "danger";
}

export interface ListBoxSectionData {
  accessibilityLabel?: string;
  className?: string;
  headerClassName?: string;
  items: ListBoxItemData[];
  key: string;
  title?: ReactNode;
}

export interface ListBoxProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  descriptionClassName?: string;
  itemClassName?: string;
  itemContentClassName?: string;
  itemTextContainerClassName?: string;
  items?: ListBoxItemData[];
  labelClassName?: string;
  onAction?: (key: string) => void;
  sectionClassName?: string;
  sectionHeaderClassName?: string;
  selectionMode?: "none";
  sections?: ListBoxSectionData[];
}

export interface ListBoxItemProps {
  children?: ReactNode;
  className?: string;
  onPress?: () => void;
  textValue?: string;
}

export interface ListBoxItemIndicatorProps {
  children?: ReactNode;
  className?: string;
}

export interface ListBoxSectionProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
}
