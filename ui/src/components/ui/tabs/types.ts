import type { ReactNode } from "react";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsVariant = "line" | "underline" | "solid";

export interface TabsProps {
  children?: ReactNode;
  className?: string;
  onValueChange: (nextValue: string) => void;
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
