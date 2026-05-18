import { HeroUINativeProvider, ToastProvider } from "heroui-native";

import { DEFAULT_TOAST_CONFIG } from "./config";
import type { UIProviderProps } from "./types";

export function UIProvider({ children, nativeConfig, toastConfig }: UIProviderProps) {
  const {
    maxVisibleToasts,
    nativeDisableFullWindowOverlay,
    nativeUnstable_accessibilityContainerViewIsModal,
    nativeInsets,
    nativeAnimation,
    nativeIsSwipeable,
    nativePlacement,
    nativeVariant,
  } = toastConfig || DEFAULT_TOAST_CONFIG;

  const defaultToastProps =
    nativeAnimation == null &&
    nativeIsSwipeable == null &&
    nativePlacement == null &&
    nativeVariant == null
      ? undefined
      : {
          animation: nativeAnimation,
          isSwipeable: nativeIsSwipeable,
          placement: nativePlacement,
          variant: nativeVariant,
        };

  return (
    <HeroUINativeProvider config={nativeConfig}>
      {children}
      <ToastProvider
        maxVisibleToasts={maxVisibleToasts}
        disableFullWindowOverlay={nativeDisableFullWindowOverlay}
        insets={nativeInsets}
        unstable_accessibilityContainerViewIsModal={
          nativeUnstable_accessibilityContainerViewIsModal
        }
        defaultProps={defaultToastProps}
      />
    </HeroUINativeProvider>
  );
}
