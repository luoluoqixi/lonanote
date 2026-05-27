import type { ComponentProps, ReactNode } from "react";
import type { AlertDialog as TamaguiAlertDialog } from "tamagui";

export interface AlertDialogProps extends ComponentProps<typeof TamaguiAlertDialog> {
  actionAriaLabel?: string;
  actionLabel?: ReactNode;
  actionProps?: AlertDialogActionProps;
  actions?: ReactNode;
  cancelAriaLabel?: string;
  cancelLabel?: ReactNode;
  cancelProps?: AlertDialogCancelProps;
  contentProps?: AlertDialogContentProps;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  description?: ReactNode;
  descriptionProps?: AlertDialogDescriptionProps;
  destructiveAriaLabel?: string;
  destructiveLabel?: ReactNode;
  destructiveProps?: AlertDialogDestructiveProps;
  overlayProps?: AlertDialogOverlayProps;
  portalProps?: AlertDialogPortalProps;
  title?: ReactNode;
  titleProps?: AlertDialogTitleProps;
  trigger?: ReactNode;
  triggerProps?: AlertDialogTriggerProps;
}
export type AlertDialogTriggerProps = ComponentProps<typeof TamaguiAlertDialog.Trigger>;
export type AlertDialogPortalProps = ComponentProps<typeof TamaguiAlertDialog.Portal>;
export type AlertDialogOverlayProps = ComponentProps<typeof TamaguiAlertDialog.Overlay>;
export type AlertDialogContentProps = ComponentProps<typeof TamaguiAlertDialog.Content>;
export type AlertDialogActionProps = ComponentProps<typeof TamaguiAlertDialog.Action>;
export type AlertDialogCancelProps = ComponentProps<typeof TamaguiAlertDialog.Cancel>;
export type AlertDialogDestructiveProps = ComponentProps<typeof TamaguiAlertDialog.Destructive>;
export type AlertDialogTitleProps = ComponentProps<typeof TamaguiAlertDialog.Title>;
export type AlertDialogDescriptionProps = ComponentProps<typeof TamaguiAlertDialog.Description>;
