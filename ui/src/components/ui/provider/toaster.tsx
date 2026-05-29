import { Toast, ToastT } from "@tamagui/toast/v2";
import { useEffect } from "react";
import { XStack, YStack } from "tamagui";

import { isWeb } from "@/api/common/platform";

const DEFAULT_XSTACK_STYLE = {
  alignItems: "flex-start",
} as const;

const DEFAULT_CLOSE_BTN_STYLE = {
  top: "50%",
  right: 14,
  transform: "translateY(-50%)",
  zIndex: 1,
} as const;

const WEB_TOAST_ANIMATION_STYLE_ID = "lonanote-web-toast-animation";
const WEB_TOAST_ANIMATION_CSS = `
[data-toast-container] [data-mounted="true"][data-removed="false"] {
  transition-duration: 560ms !important;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
}

[data-toast-container] [data-removed="true"] {
  transition-duration: 220ms !important;
}
`;

function useWebToastAnimationOverride() {
  useEffect(() => {
    if (!isWeb()) {
      return;
    }

    if (document.getElementById(WEB_TOAST_ANIMATION_STYLE_ID) != null) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = WEB_TOAST_ANIMATION_STYLE_ID;
    styleElement.textContent = WEB_TOAST_ANIMATION_CSS;
    document.head.appendChild(styleElement);

    return () => {
      styleElement.remove();
    };
  }, []);
}

function ToastContent({ toast: t }: { toast: ToastT }) {
  const title = typeof t.title === "function" ? t.title() : t.title;
  const description = typeof t.description === "function" ? t.description() : t.description;

  return (
    <>
      <XStack gap="$3" style={DEFAULT_XSTACK_STYLE}>
        <Toast.Icon />
        <YStack flex={1} gap="$0.5">
          {title && (
            <Toast.Title fontWeight="600" size="$3">
              {title}
            </Toast.Title>
          )}
          {description && (
            <Toast.Description color="$color9" size="$2">
              {description}
            </Toast.Description>
          )}
        </YStack>
      </XStack>

      {isWeb() && (
        <Toast.Close
          testID="toast-close-button"
          position="absolute"
          style={DEFAULT_CLOSE_BTN_STYLE}
        />
      )}
    </>
  );
}

function ToastList() {
  return (
    <Toast.List
      renderItem={({ toast: t, index }) => (
        <Toast.Item
          key={t.id}
          toast={t}
          index={index}
          onPointerDown={
            isWeb()
              ? (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }
              : undefined
          }
        >
          <ToastContent toast={t} />
        </Toast.Item>
      )}
    ></Toast.List>
  );
}

export function Toaster() {
  useWebToastAnimationOverride();

  const position = isWeb() ? "bottom-right" : "bottom-center";
  return (
    <Toast position={position} visibleToasts={4} duration={5000} gap={16}>
      <Toast.Viewport data-toast-container>
        <ToastList />
      </Toast.Viewport>
    </Toast>
  );
}
