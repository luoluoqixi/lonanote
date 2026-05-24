import type { ComponentProps, ReactNode } from "react";
import type { Dialog as TamaguiDialog } from "tamagui";

export interface DialogProps extends ComponentProps<typeof TamaguiDialog> {
  actions?: ReactNode;
  closeLabel?: ReactNode;
  closeProps?: DialogCloseProps;
  contentProps?: DialogContentProps;
  description?: ReactNode;
  descriptionProps?: DialogDescriptionProps;
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
