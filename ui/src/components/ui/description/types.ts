import type { ReactNode } from "react";

export interface DescriptionProps {
  children?: ReactNode;
  className?: string;
  hideOnInvalid?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
}
