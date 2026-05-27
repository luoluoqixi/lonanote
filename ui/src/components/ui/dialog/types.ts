import type { ComponentProps, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import type { Dialog as TamaguiDialog } from "tamagui";

export interface DialogProps extends ComponentProps<typeof TamaguiDialog> {
  dismissOnBackPress?: boolean;
  actions?: ReactNode;
  closeAriaLabel?: string;
  closeBtn?: boolean;
  closeProps?: DialogCloseProps;
  contentProps?: DialogContentProps;
  dismissOnOverlayPress?: boolean;
  description?: ReactNode;
  descriptionProps?: DialogDescriptionProps;
  width?: ViewStyle["width"];
  height?: ViewStyle["height"];
  minWidth?: ViewStyle["minWidth"];
  minHeight?: ViewStyle["minHeight"];
  maxWidth?: ViewStyle["maxWidth"];
  maxHeight?: ViewStyle["maxHeight"];
  overlayProps?: DialogOverlayProps;
  portalProps?: DialogPortalProps;
  title?: ReactNode;
  titleProps?: DialogTitleProps;
  trigger?: ReactNode;
  triggerProps?: DialogTriggerProps;
}
export type DialogTriggerProps = ComponentProps<typeof TamaguiDialog.Trigger>;
export type DialogPortalProps = ComponentProps<typeof TamaguiDialog.Portal>;
export type DialogOverlayProps = ComponentProps<typeof TamaguiDialog.Overlay>;
export type DialogContentProps = ComponentProps<typeof TamaguiDialog.Content>;
export type DialogTitleProps = ComponentProps<typeof TamaguiDialog.Title>;
export type DialogDescriptionProps = ComponentProps<typeof TamaguiDialog.Description>;
export type DialogCloseProps = ComponentProps<typeof TamaguiDialog.Close>;
