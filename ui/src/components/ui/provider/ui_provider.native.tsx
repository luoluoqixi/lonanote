import { HeroUINativeProvider } from "heroui-native";

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

  const defaultProps =
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
    <HeroUINativeProvider
      config={{
        toast: {
          defaultProps,
          maxVisibleToasts,
          insets: nativeInsets,
          disableFullWindowOverlay: nativeDisableFullWindowOverlay,
          unstable_accessibilityContainerViewIsModal:
            nativeUnstable_accessibilityContainerViewIsModal,
        },
        ...nativeConfig,
      }}
    >
      {children}
    </HeroUINativeProvider>
  );
}
