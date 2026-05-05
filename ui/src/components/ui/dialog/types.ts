import type { ReactNode } from "react";

export interface DialogProps {
  actions?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
}
