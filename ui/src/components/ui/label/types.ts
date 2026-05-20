import type { ReactNode } from "react";

export interface LabelProps {
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
}
