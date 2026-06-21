import { type ComponentRef, type ComponentType, forwardRef } from "react";
import { Button as RNButton } from "react-native";
import { Button as TamaguiButton } from "tamagui";
import { useTheme } from "tamagui";

import { isWeb, os } from "@/api/common/platform";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { ButtonProps } from "./types";

const DISABLED_LONG_PRESS_DELAY = 2_147_483_647;
const TamaguiButtonWithLongPressDelay = TamaguiButton as unknown as ComponentType<
  ButtonProps & { ref?: React.Ref<ComponentRef<typeof TamaguiButton>> }
>;

const DISABLED_BUTTON_OPACITY = 0.5;
const ENABLED_BUTTON_OPACITY = 1;

export const Button = forwardRef<ComponentRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  const { children, delayLongPress, native, nativeHaptics, onPress, title, ...buttonProps } = props;
  const theme = useTheme();
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const resolvedDelayLongPress =
    delayLongPress ?? (props.onLongPress == null ? DISABLED_LONG_PRESS_DELAY : undefined);
  const handlePress: NonNullable<ButtonProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(resolvedNativeHaptics);
  };

  const resolvedOpacity = buttonProps.disabled ? DISABLED_BUTTON_OPACITY : ENABLED_BUTTON_OPACITY;
  const useNativeButton = native === true && (os() === "ios" || os() === "android");
  const resolvedTitle =
    title ??
    (typeof children === "string"
      ? children
      : typeof children === "number"
        ? String(children)
        : undefined) ??
    "";

  if (useNativeButton) {
    return (
      <RNButton
        accessibilityLabel={props["aria-label"]}
        color={theme.accentColor?.val ?? theme.color6?.val ?? theme.color?.val}
        disabled={buttonProps.disabled}
        onPress={handlePress}
        title={resolvedTitle}
      />
    );
  }

  if (isWeb()) {
    return (
      <TamaguiButton opacity={resolvedOpacity} {...buttonProps} onPress={handlePress} ref={ref}>
        {children}
      </TamaguiButton>
    );
  }

  return (
    <TamaguiButtonWithLongPressDelay
      opacity={resolvedOpacity}
      {...buttonProps}
      delayLongPress={resolvedDelayLongPress}
      onPress={handlePress}
      ref={ref}
    >
      {children ?? resolvedTitle}
    </TamaguiButtonWithLongPressDelay>
  );
});
