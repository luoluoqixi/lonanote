import { type PressEvent, Link as WebLink } from "@heroui/react";
import { LinkButton as NativeLinkButton } from "heroui-native";
import type { ComponentProps, HTMLAttributeAnchorTarget, ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

type LinkPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeLinkButton>,
    "accessibilityLabel" | "children" | "className" | "isDisabled" | "onPress"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebLink>,
    "aria-label" | "children" | "className" | "href" | "isDisabled" | "onPress" | "rel" | "target"
  >;
};

export interface LinkProps extends LinkPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent | GestureResponderEvent) => void | Promise<void>;
  rel?: string;
  target?: HTMLAttributeAnchorTarget;
}
