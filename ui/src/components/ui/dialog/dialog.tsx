import { X } from "@tamagui/lucide-icons-2";
import { StyleSheet, type ViewStyle } from "react-native";
import { Dialog as TamaguiDialog, Unspaced, XStack, YStack } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { Button } from "@/components/ui/button";
import { resolveAriaLabel } from "@/components/ui/utils";

import type {
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogOverlayProps,
  DialogPortalProps,
  DialogProps,
  DialogTitleProps,
  DialogTriggerProps,
} from "./types";

function DialogRoot(props: DialogProps) {
  const {
    actions,
    children,
    closeAriaLabel,
    closeBtn = true,
    closeProps,
    contentProps,
    description,
    descriptionProps,
    width,
    height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    overlayProps,
    portalProps,
    title,
    titleProps,
    trigger,
    triggerProps,
    disableRemoveScroll,
    ...rootProps
  } = props;
  const { style: contentStyle, ...restContentProps } = contentProps ?? {};
  const flattenedContentStyle = StyleSheet.flatten(contentStyle) as
    | Partial<
        Pick<ViewStyle, "height" | "minHeight" | "minWidth" | "maxHeight" | "maxWidth" | "width">
      >
    | undefined;
  const resolvedSizeStyle: ViewStyle = {
    width: flattenedContentStyle?.width ?? width ?? "50%",
    height: flattenedContentStyle?.height ?? height ?? "50%",
    minWidth: flattenedContentStyle?.minWidth ?? minWidth,
    minHeight: flattenedContentStyle?.minHeight ?? minHeight,
    maxWidth: flattenedContentStyle?.maxWidth ?? maxWidth,
    maxHeight: flattenedContentStyle?.maxHeight ?? maxHeight,
  };
  const resolvedContentStyle = [contentStyle, resolvedSizeStyle] as DialogContentProps["style"];
  const hasDefaultStructure =
    trigger != null || title != null || description != null || actions != null;

  if (!hasDefaultStructure) {
    return <TamaguiDialog {...rootProps}>{children}</TamaguiDialog>;
  }

  return (
    <TamaguiDialog disableRemoveScroll={disableRemoveScroll ?? isWeb()} {...rootProps}>
      {trigger != null ? <DialogTrigger {...triggerProps}>{trigger}</DialogTrigger> : null}
      <DialogPortal {...portalProps}>
        <DialogOverlay opacity={0.5} {...overlayProps} />
        <DialogContent {...restContentProps} style={resolvedContentStyle}>
          <YStack flex={1} gap="$3" style={{ minHeight: 0 }}>
            {title != null ? <DialogTitle {...titleProps}>{title}</DialogTitle> : null}
            {description != null ? (
              <DialogDescription {...descriptionProps}>{description}</DialogDescription>
            ) : null}
            {children}
            {actions != null ? (
              <XStack gap="$2" style={{ justifyContent: "flex-end" }}>
                {actions}
              </XStack>
            ) : null}
            {closeBtn === true ? (
              <Unspaced>
                <DialogClose {...closeProps} asChild>
                  <Button
                    aria-label={resolveAriaLabel(closeAriaLabel, "关闭对话框")}
                    position="absolute"
                    r="$3"
                    size="$2"
                    circular
                    icon={X}
                  />
                </DialogClose>
              </Unspaced>
            ) : null}
          </YStack>
        </DialogContent>
      </DialogPortal>
    </TamaguiDialog>
  );
}

function DialogTrigger(props: DialogTriggerProps) {
  return <TamaguiDialog.Trigger {...props} />;
}

function DialogPortal(props: DialogPortalProps) {
  return <TamaguiDialog.Portal {...props} />;
}

function DialogOverlay(props: DialogOverlayProps) {
  return <TamaguiDialog.Overlay {...props} />;
}

function DialogContent(props: DialogContentProps) {
  return <TamaguiDialog.Content {...props} />;
}

function DialogTitle(props: DialogTitleProps) {
  return <TamaguiDialog.Title {...props} />;
}

function DialogDescription(props: DialogDescriptionProps) {
  return <TamaguiDialog.Description {...props} />;
}

function DialogClose(props: DialogCloseProps) {
  return <TamaguiDialog.Close {...props} />;
}

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
});
