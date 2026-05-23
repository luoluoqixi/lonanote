import type { ToastVariants } from "@heroui/react";
import type {
  HeroUINativeProviderProps,
  ToastInsets,
  ToastPlacement,
  ToastRootAnimation,
  ToastVariant,
} from "heroui-native";
import type { ReactNode } from "react";

export interface UIProviderProps {
  children: ReactNode;
  nativeConfig?: HeroUINativeProviderProps["config"];
  toastConfig?: ToastProviderProps;
}

export interface ToastProviderProps {
  /** [Web only] The gap between toasts. @default 8 */
  webGap?: number;
  /** [Web only] The scale factor for toasts. @default 0.05 */
  webScaleFactor?: number;
  /** [Web only] The placement of the toast. */
  webPlacement?: ToastVariants["placement"];
  /** [Web only] The width of the toast. @default 460 */
  webWidth?: number | string;
  /**
   * [native only] Visual variant of the toast
   * @default 'default'
   */
  nativeVariant?: ToastVariant;
  /**
   * [native only] Placement of the toast
   * @default 'top'
   */
  nativePlacement?: ToastPlacement;
  /**
   * [native only] When true, uses a regular View instead of FullWindowOverlay on iOS for toasts.
   * Enables React Native element inspector but toasts won't appear above native modals.
   * @default false
   */
  nativeDisableFullWindowOverlay?: boolean;
  /**
   * [native only] Controls whether VoiceOver treats the toast overlay window as a modal container.
   * When `false`, VoiceOver can still access elements behind the overlay.
   * When `true`, VoiceOver is restricted to elements inside the overlay.
   * @default false
   * @platform ios
   * @unstable This prop maps directly to the native `accessibilityViewIsModal`
   * on the container view and may change in a future react-native-screens release.
   */
  nativeUnstable_accessibilityContainerViewIsModal?: boolean;
  /**
   * [native only] Insets for spacing from screen edges (added to safe area insets)
   * @default Platform-specific:
   *   - iOS: { top: 0, bottom: 6, left: 12, right: 12 }
   *   - Android: { top: 12, bottom: 12, left: 12, right: 12 }
   */
  nativeInsets?: ToastInsets;
  /**
   * [native only] Animation configuration for toast
   * - `false` or `"disabled"`: Disable only root animations
   * - `"disable-all"`: Disable all animations including children
   * - `true` or `undefined`: Use default animations
   * - `object`: Custom animation configuration
   */
  nativeAnimation?: ToastRootAnimation;
  /**
   * [native only] Whether the toast can be swiped to dismiss and dragged with rubber effect
   * @default true
   */
  nativeIsSwipeable?: boolean;

  /**
   * Maximum number of visible toasts before opacity starts fading
   * Controls when toast items begin to fade out as they move beyond the visible stack
   * @default 3
   */
  maxVisibleToasts?: number;
}

export interface RootProviderProps extends UIProviderProps {}
