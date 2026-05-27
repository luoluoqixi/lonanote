import { useDialogContext } from "@tamagui/dialog";
import { X } from "@tamagui/lucide-icons-2";
import { useEffect } from "react";
import { BackHandler, StyleSheet, type ViewStyle } from "react-native";
import { Dialog as TamaguiDialog, Unspaced, XStack, YStack } from "tamagui";

import { isWeb, os } from "@/api/common/platform";
import { Button } from "@/components/ui/button";
import { resolveAriaLabel } from "@/components/ui/utils";

import {
  type OutsideInteractionEvent,
  preventDialogDismissForDragRegion,
} from "./dialog_outside_interaction";
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

const DEFAULT_WIDTH = isWeb() ? "60%" : "80%";
const DEFAULT_Height = isWeb() ? "60%" : "40%";
const DEFAULT_OVERLAY_TRANSITION = "100ms";

type DialogOverlayBehaviorProps = DialogOverlayProps & {
  dismissOnOverlayPress?: boolean;
};

type DialogContentBehaviorProps = DialogContentProps & {
  dismissOnOverlayPress?: boolean;
};

type DialogBackPressBehaviorProps = {
  dismissOnBackPress?: boolean;
  scope?: string;
};

function DialogRoot(props: DialogProps) {
  const scope = (props as { scope?: string }).scope;
  const {
    actions,
    children,
    closeAriaLabel,
    closeBtn = true,
    closeProps,
    contentProps,
    dismissOnBackPress = true,
    dismissOnOverlayPress = true,
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
    width: flattenedContentStyle?.width ?? width ?? DEFAULT_WIDTH,
    height: flattenedContentStyle?.height ?? height ?? DEFAULT_Height,
    minWidth: flattenedContentStyle?.minWidth ?? minWidth,
    minHeight: flattenedContentStyle?.minHeight ?? minHeight,
    maxWidth: flattenedContentStyle?.maxWidth ?? maxWidth,
    maxHeight: flattenedContentStyle?.maxHeight ?? maxHeight,
  };
  const resolvedContentStyle = [contentStyle, resolvedSizeStyle] as DialogContentProps["style"];
  const hasDefaultStructure =
    trigger != null || title != null || description != null || actions != null;

  if (!hasDefaultStructure) {
    return (
      <TamaguiDialog {...rootProps}>
        <DialogBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
        {children}
      </TamaguiDialog>
    );
  }

  return (
    <TamaguiDialog disableRemoveScroll={disableRemoveScroll ?? isWeb()} {...rootProps}>
      <DialogBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
      {trigger != null ? <DialogTrigger {...triggerProps}>{trigger}</DialogTrigger> : null}
      <DialogPortal {...portalProps}>
        <DialogOverlay
          opacity={0.5}
          animateOnly={["transform", "opacity"]}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          transition={DEFAULT_OVERLAY_TRANSITION}
          {...overlayProps}
          dismissOnOverlayPress={dismissOnOverlayPress}
        />
        <DialogContent
          transition={[
            "quicker",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: 20, opacity: 0 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          {...restContentProps}
          dismissOnOverlayPress={dismissOnOverlayPress}
          style={resolvedContentStyle}
        >
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
                    aria-label={resolveAriaLabel(closeAriaLabel, "Close")}
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
  return <TamaguiDialog.Trigger {...props} asChild />;
}

function DialogPortal(props: DialogPortalProps) {
  return <TamaguiDialog.Portal {...props} />;
}

function DialogOverlay(props: DialogOverlayBehaviorProps) {
  const { dismissOnOverlayPress = true, ...overlayProps } = props;
  const context = useDialogContext((overlayProps as { scope?: string }).scope);

  return (
    <TamaguiDialog.Overlay
      {...overlayProps}
      onPress={(event) => {
        overlayProps.onPress?.(event);

        if (!event.defaultPrevented && dismissOnOverlayPress && !isWeb()) {
          context.onOpenChange(false);
        }
      }}
      transition={overlayProps.transition ?? DEFAULT_OVERLAY_TRANSITION}
    />
  );
}

function DialogContent(props: DialogContentBehaviorProps) {
  const {
    dismissOnOverlayPress = true,
    onInteractOutside,
    onPointerDownOutside,
    ...restProps
  } = props;

  return (
    <TamaguiDialog.Content
      {...restProps}
      onPointerDownOutside={(event) => {
        onPointerDownOutside?.(event);
        preventDialogDismissForDragRegion(event as OutsideInteractionEvent);

        if (!event.defaultPrevented && !dismissOnOverlayPress) {
          event.preventDefault();
        }
      }}
      onInteractOutside={(event) => {
        onInteractOutside?.(event);
        preventDialogDismissForDragRegion(event as OutsideInteractionEvent);

        if (!event.defaultPrevented && !dismissOnOverlayPress) {
          event.preventDefault();
        }
      }}
    />
  );
}

function DialogBackHandler(props: DialogBackPressBehaviorProps) {
  const { dismissOnBackPress = true, scope } = props;
  const context = useDialogContext(scope);
  const { open, onOpenChange } = context;

  useEffect(() => {
    if (os() !== "android" || !dismissOnBackPress || !open) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onOpenChange(false);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [dismissOnBackPress, onOpenChange, open]);

  return null;
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
