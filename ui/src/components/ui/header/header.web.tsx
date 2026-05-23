import { Header as HeroUIHeader } from "@heroui/react";

import type { HeaderProps } from "./types";

export function Header({ children, className, nativeProps, webProps }: HeaderProps) {
  void nativeProps;
  return (
    <HeroUIHeader className={className} {...(webProps as any)}>
      {children}
    </HeroUIHeader>
  );
}
