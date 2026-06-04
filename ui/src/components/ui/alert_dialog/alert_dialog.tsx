import { useDialogContext } from "@tamagui/dialog";
import { type ReactElement, useEffect } from "react";
import { BackHandler } from "react-native";
import {
  AlertDialog as TamaguiAlertDialog,
  Dialog as TamaguiDialog,
  XStack,
  YStack,
} from "tamagui";

import { isWeb, os } from "@/api/common/platform";
import { Button } from "@/components/ui/button";
import {
  type OutsideInteractionEvent,
  preventDialogDismissForDragRegion,
} from "@/components/ui/dialog/dialog_outside_interaction";
import { resolveAriaLabel } from "@/components/ui/utils";
import { useTrueSheetCenteredModalContentOffsetY } from "@/components/ui/utils/use_true_sheet_centered_modal_layout";

import type {
  AlertDialogActionProps,
  AlertDialogCancelProps,
  AlertDialogContentProps,
  AlertDialogDescriptionProps,
  AlertDialogDestructiveProps,
  AlertDialogOverlayProps,
  AlertDialogPortalProps,
  AlertDialogProps,
  AlertDialogTitleProps,
  AlertDialogTriggerProps,
} from "./types";

const DEFAULT_OVERLAY_TRANSITION = "100ms";

type AlertDialogOverlayBehaviorProps = AlertDialogOverlayProps & {
  dismissOnOverlayPress?: boolean;
};

type AlertDialogContentBaseProps = AlertDialogContentProps & {
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  onInteractOutside?: (event: OutsideInteractionEvent) => void;
  onPointerDownOutside?: (event: OutsideInteractionEvent) => void;
};

type AlertDialogBackPressBehaviorProps = {
  dismissOnBackPress?: boolean;
  scope?: string;
};

const AlertDialogContentBase = TamaguiDialog.Content as unknown as (
  props: AlertDialogContentBaseProps,
) => ReactElement | null;

function AlertDialogRoot(props: AlertDialogProps) {
  const scope = (props as { scope?: string }).scope;
  const {
    actionAriaLabel,
    actionLabel,
    actionProps,
    actions,
    cancelAriaLabel,
    cancelLabel,
    cancelProps,
    children,
    contentProps,
    dismissOnBackPress = true,
    dismissOnOverlayPress = false,
    description,
    descriptionProps,
    destructiveAriaLabel,
    destructiveLabel,
    destructiveProps,
    overlayProps,
    portalProps,
    title,
    titleProps,
    trigger,
    triggerProps,
    disableRemoveScroll,
    ...rootProps
  } = props;
  const hasDefaultStructure =
    trigger != null ||
    title != null ||
    description != null ||
    actions != null ||
    cancelLabel != null ||
    actionLabel != null ||
    destructiveLabel != null;

  if (!hasDefaultStructure) {
    return (
      <TamaguiAlertDialog {...rootProps}>
        <AlertDialogBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
        {children}
      </TamaguiAlertDialog>
    );
  }

  return (
    <TamaguiAlertDialog disableRemoveScroll={disableRemoveScroll ?? isWeb()} {...rootProps}>
      <AlertDialogBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
      {trigger != null ? (
        <AlertDialogTrigger {...triggerProps}>{trigger}</AlertDialogTrigger>
      ) : null}
      <AlertDialogPortal {...portalProps}>
        <AlertDialogOverlay
          opacity={0.5}
          animateOnly={["transform", "opacity"]}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          transition={DEFAULT_OVERLAY_TRANSITION}
          {...overlayProps}
          dismissOnOverlayPress={dismissOnOverlayPress}
        />
        <AlertDialogContent
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
          {...contentProps}
          dismissOnOverlayPress={dismissOnOverlayPress}
        >
          <YStack gap="$3">
            {title != null ? <AlertDialogTitle {...titleProps}>{title}</AlertDialogTitle> : null}
            {description != null ? (
              <AlertDialogDescription {...descriptionProps}>{description}</AlertDialogDescription>
            ) : null}
            {children}
            {actions != null ||
            cancelLabel != null ||
            actionLabel != null ||
            destructiveLabel != null ? (
              <XStack gap="$2" style={{ justifyContent: "flex-end" }}>
                {actions}
                {cancelLabel != null ? (
                  <AlertDialogCancel {...cancelProps} asChild>
                    <Button aria-label={resolveAriaLabel(cancelAriaLabel, cancelLabel)}>
                      {cancelLabel}
                    </Button>
                  </AlertDialogCancel>
                ) : null}
                {actionLabel != null ? (
                  <AlertDialogAction {...actionProps} asChild>
                    <Button aria-label={resolveAriaLabel(actionAriaLabel, actionLabel)}>
                      {actionLabel}
                    </Button>
                  </AlertDialogAction>
                ) : null}
                {destructiveLabel != null ? (
                  <AlertDialogDestructive {...destructiveProps} asChild>
                    <Button
                      aria-label={resolveAriaLabel(destructiveAriaLabel, destructiveLabel)}
                      theme="red"
                    >
                      {destructiveLabel}
                    </Button>
                  </AlertDialogDestructive>
                ) : null}
              </XStack>
            ) : null}
          </YStack>
        </AlertDialogContent>
      </AlertDialogPortal>
    </TamaguiAlertDialog>
  );
}

function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <TamaguiAlertDialog.Trigger {...props} asChild />;
}

function AlertDialogPortal(props: AlertDialogPortalProps) {
  return <TamaguiAlertDialog.Portal {...props} />;
}

function AlertDialogOverlay(props: AlertDialogOverlayBehaviorProps) {
  const { dismissOnOverlayPress = false, ...overlayProps } = props;
  const context = useDialogContext((overlayProps as { scope?: string }).scope);

  if (isWeb() && !context.open) {
    return null;
  }

  return (
    <TamaguiAlertDialog.Overlay
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

function AlertDialogContent(props: AlertDialogContentBaseProps) {
  const contentProps = props;
  const {
    dismissOnOverlayPress = false,
    onInteractOutside,
    onPointerDownOutside,
    y: yProp,
    ...restProps
  } = contentProps;
  const trueSheetCenterY = useTrueSheetCenteredModalContentOffsetY();

  return (
    <AlertDialogContentBase
      role="alertdialog"
      aria-modal={true}
      {...restProps}
      y={yProp ?? (trueSheetCenterY !== 0 ? trueSheetCenterY : undefined)}
      onPointerDownOutside={(event) => {
        onPointerDownOutside?.(event);
        preventDialogDismissForDragRegion(event);

        if (!event.defaultPrevented && !dismissOnOverlayPress) {
          event.preventDefault();
        }
      }}
      onInteractOutside={(event) => {
        onInteractOutside?.(event);
        preventDialogDismissForDragRegion(event);

        if (!event.defaultPrevented && !dismissOnOverlayPress) {
          event.preventDefault();
        }
      }}
    />
  );
}

function AlertDialogBackHandler(props: AlertDialogBackPressBehaviorProps) {
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

function AlertDialogAction(props: AlertDialogActionProps) {
  return <TamaguiAlertDialog.Action {...props} />;
}

function AlertDialogCancel(props: AlertDialogCancelProps) {
  return <TamaguiAlertDialog.Cancel {...props} />;
}

function AlertDialogDestructive(props: AlertDialogDestructiveProps) {
  return <TamaguiAlertDialog.Destructive {...props} />;
}

function AlertDialogTitle(props: AlertDialogTitleProps) {
  return <TamaguiAlertDialog.Title {...props} />;
}

function AlertDialogDescription(props: AlertDialogDescriptionProps) {
  return <TamaguiAlertDialog.Description {...props} />;
}

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
  Destructive: AlertDialogDestructive,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
});
