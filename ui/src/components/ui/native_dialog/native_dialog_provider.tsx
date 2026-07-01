import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { AlertDialog } from "@/components/ui/alert_dialog";
import { Button } from "@/components/ui/button";

import { runNativeDialogButton, setNativeDialogHandler } from "./native_dialog";
import type { NativeDialogButton, NativeDialogRequest, NativeDialogResult } from "./types";

function getButtonComponent(button: NativeDialogButton) {
  if (button.style === "cancel") {
    return AlertDialog.Cancel;
  }

  if (button.style === "destructive") {
    return AlertDialog.Destructive;
  }

  return AlertDialog.Action;
}

function getButtonTheme(button: NativeDialogButton) {
  return button.style === "destructive" ? "red" : undefined;
}

export function NativeDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<NativeDialogRequest | null>(null);
  const requestRef = useRef<NativeDialogRequest | null>(null);

  useEffect(() => {
    setNativeDialogHandler((nextRequest) => {
      requestRef.current = nextRequest;
      setRequest(nextRequest);
    });
    return () => {
      setNativeDialogHandler(null);
    };
  }, []);

  const settle = useCallback(async (result: NativeDialogResult, button?: NativeDialogButton) => {
    const currentRequest = requestRef.current;
    if (currentRequest == null) {
      return;
    }

    requestRef.current = null;
    setRequest(null);

    if (button != null) {
      await runNativeDialogButton(button);
    }

    currentRequest.resolve(result);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        void settle("dismiss");
      }
    },
    [settle],
  );

  const actions =
    request?.buttons.map((button) => {
      const Action = getButtonComponent(button);
      return (
        <Action key={button.key} asChild>
          <Button
            nativeHaptics
            onPress={() => {
              void settle(button.key, button);
            }}
            theme={getButtonTheme(button)}
          >
            {button.text}
          </Button>
        </Action>
      );
    }) ?? null;

  return (
    <>
      {children}
      <AlertDialog
        actions={actions}
        description={request?.options.message}
        dismissOnBackPress={request?.options.cancelable ?? true}
        dismissOnOverlayPress={request?.options.cancelable ?? true}
        onOpenChange={handleOpenChange}
        open={request != null}
        title={request?.options.title}
      />
    </>
  );
}
