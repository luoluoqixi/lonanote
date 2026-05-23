import type { ReactNode } from "react";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsVariant = "line" | "underline" | "solid";

export interface TabsItem {
  content?: ReactNode;
  label: ReactNode;
  panelClassName?: string;
  tabClassName?: string;
  value: string;
}

export interface TabsProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  variant?: "secondary" | "primary";
  orientation?: TabsOrientation;
  className?: string;
  indicatorClassName?: string;
  items?: TabsItem[];
  listClassName?: string;
  listContainerClassName?: string;
  onValueChange: (nextValue: string) => void;
  panelClassName?: string;
  tabClassName?: string;
  value: string;
}

export interface TabsListContainerProps {
  children?: ReactNode;
  className?: string;
}

export interface TabsListProps {
  children?: ReactNode;
  className?: string;
}

export interface TabsTabProps {
  children?: ReactNode;
  className?: string;
  value: string;
}

export interface TabsIndicatorProps {
  className?: string;
}

export interface TabsSeparatorProps {
  betweenValues: string[];
  className?: string;
}

export interface TabsPanelProps {
  children?: ReactNode;
  className?: string;
  value: string;
}
