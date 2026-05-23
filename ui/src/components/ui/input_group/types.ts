import type { ReactNode } from "react";

import type { InputProps } from "../input";

export interface InputGroupProps {
  animation?: "disable-all";
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
}

export interface InputGroupInputProps extends InputProps {}

export interface InputGroupPrefixProps {
  children?: ReactNode;
  className?: string;
  isDecorative?: boolean;
}

export interface InputGroupSuffixProps {
  children?: ReactNode;
  className?: string;
  isDecorative?: boolean;
}
