import type { ReactNode } from "react";

export interface FieldErrorProps {
  children?: ReactNode;
  className?: string;
  isInvalid?: boolean;
}
