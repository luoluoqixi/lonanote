import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "@tamagui/lucide-icons-2";
import { Toast, ToastT } from "@tamagui/toast/v2";
import { useEffect } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Spinner, XStack, YStack } from "tamagui";

import { isWeb, os } from "@/api/common/platform";
import { useTrueSheetOverlayLayout } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_layout_context";

import { getScopedToastViewportBottomInset } from "../utils/overlay_toast_layout";

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

type ToastAppearanceType = NonNullable<ToastT["type"]> | "default";

type ToastAppearance = {
  background: ComponentProps<typeof Toast.Item>["background"];
  borderColor: ComponentProps<typeof Toast.Item>["borderColor"];
  closeBorderColor: ComponentProps<typeof Toast.Close>["borderColor"];
  descriptionColor: ComponentProps<typeof Toast.Description>["color"];
  iconBackground: ComponentProps<typeof YStack>["background"];
  titleColor: ComponentProps<typeof Toast.Title>["color"];
};

const TOAST_APPEARANCES: Record<ToastAppearanceType, ToastAppearance> = {
  default: {
    background: "$background",
    borderColor: "$borderColor",
    closeBorderColor: "$borderColor",
    descriptionColor: "$color10",
    iconBackground: "$color4",
    titleColor: "$color12",
  },
  error: {
    background: "$red2",
    borderColor: "$red6",
    closeBorderColor: "$red7",
    descriptionColor: "$red10",
    iconBackground: "$red4",
    titleColor: "$red11",
  },
  info: {
    background: "$blue2",
    borderColor: "$blue6",
    closeBorderColor: "$blue7",
    descriptionColor: "$blue10",
    iconBackground: "$blue4",
    titleColor: "$blue11",
  },
  loading: {
    background: "$blue1",
    borderColor: "$blue6",
    closeBorderColor: "$blue7",
    descriptionColor: "$blue10",
    iconBackground: "$blue3",
    titleColor: "$blue11",
  },
  success: {
    background: "$green2",
    borderColor: "$green6",
    closeBorderColor: "$green7",
    descriptionColor: "$green10",
    iconBackground: "$green4",
    titleColor: "$green11",
  },
  warning: {
    background: "$yellow2",
    borderColor: "$yellow6",
    closeBorderColor: "$yellow7",
    descriptionColor: "$yellow11",
    iconBackground: "$yellow4",
    titleColor: "$yellow11",
  },
};

function getToastAppearance(toast: ToastT): ToastAppearance {
  return TOAST_APPEARANCES[toast.type ?? "default"];
}

function getToastIconStyle(centered: boolean) {
  if (centered) {
    return undefined;
  }

  return {
    marginTop: 3,
    transform: [{ translateY: 2 }],
  } as const;
}

function ToastTypeIcon(props: {
  background: ComponentProps<typeof YStack>["background"];
  children: ReactNode;
  centered?: boolean;
}) {
  const { background, centered = false, children } = props;
  const isFixCenter = isWeb() || os() === "ios";
  const iosStyle = isFixCenter ? getToastIconStyle(centered) : undefined;

  return (
    <YStack
      background={background}
      mt={!isFixCenter && !centered ? "$0.5" : 0}
      rounded="$10"
      shrink={0}
      width={28}
      height={28}
      style={{
        alignItems: "center",
        justifyContent: "center",
        ...iosStyle,
      }}
    >
      {children}
    </YStack>
  );
}

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
  const appearance = getToastAppearance(t);
  const title = typeof t.title === "function" ? t.title() : t.title;
  const description = typeof t.description === "function" ? t.description() : t.description;
  const isTitleOnlyToast = description == null;
  const toastType = t.type ?? "default";

  const iconByType = {
    error: <CircleAlert color="$red11" size={16} />,
    info: <Info color="$blue11" size={16} />,
    loading: <Spinner color="$blue11" size="small" />,
    success: <CircleCheckBig color="$green11" size={16} />,
    warning: <TriangleAlert color="$yellow11" size={16} />,
  } as const;

  const leadingIcon =
    t.icon !== undefined ? (
      <ToastTypeIcon background={appearance.iconBackground} centered={isTitleOnlyToast}>
        {t.icon}
      </ToastTypeIcon>
    ) : toastType in iconByType ? (
      <ToastTypeIcon background={appearance.iconBackground} centered={isTitleOnlyToast}>
        {iconByType[toastType as keyof typeof iconByType]}
      </ToastTypeIcon>
    ) : null;

  return (
    <>
      <XStack gap="$3" style={{ alignItems: isTitleOnlyToast ? "center" : "flex-start" }}>
        {leadingIcon}
        <YStack flex={1} gap={isTitleOnlyToast ? 0 : "$0.5"}>
          {title && (
            <Toast.Title color={appearance.titleColor} fontWeight="600" size="$3">
              {title}
            </Toast.Title>
          )}
          {description && (
            <Toast.Description color={appearance.descriptionColor} size="$2">
              {description}
            </Toast.Description>
          )}
        </YStack>
      </XStack>

      {isWeb() && (
        <Toast.Close
          background="$background"
          borderColor={appearance.closeBorderColor}
          testID="toast-close-button"
          position="absolute"
          style={DEFAULT_CLOSE_BTN_STYLE}
        />
      )}
    </>
  );
}

function shouldRenderToastInViewport(
  toast: ToastT & { viewportName?: string | "default" },
  viewportName: string | undefined,
): boolean {
  if (viewportName == null) {
    return toast.viewportName == null || toast.viewportName === "default";
  }

  return toast.viewportName === viewportName;
}

function ToastList({ viewportName }: { viewportName?: string }) {
  return (
    <Toast.List
      renderItem={({ toast: t, index }) => {
        const scopedToast = t as ToastT & { viewportName?: string | "default" };
        if (!shouldRenderToastInViewport(scopedToast, viewportName)) {
          return null;
        }

        const appearance = getToastAppearance(t);

        return (
          <Toast.Item
            key={t.id}
            background={appearance.background}
            borderColor={appearance.borderColor}
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
            {t.jsx ?? <ToastContent toast={t} />}
          </Toast.Item>
        );
      }}
    ></Toast.List>
  );
}

export {
  IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET,
  IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET,
  SCOPED_TOAST_VIEWPORT_INSET,
} from "../utils/overlay_toast_layout";

export function Toaster({ viewportName }: { viewportName?: string }) {
  useWebToastAnimationOverride();
  const { detent } = useTrueSheetOverlayLayout();

  const position = isWeb() ? "bottom-right" : "bottom-center";
  const scopedViewport = viewportName != null;
  const viewportStyle = scopedViewport
    ? {
        bottom: getScopedToastViewportBottomInset(viewportName, detent),
        left: 16,
        right: 16,
        top: "auto" as const,
      }
    : undefined;
  const portalToRoot = viewportName == null;
  return (
    <Toast position={position} visibleToasts={4} duration={5000} gap={16}>
      <Toast.Viewport
        data-toast-container
        {...(!portalToRoot ? ({ portalToRoot: false } as Record<string, unknown>) : null)}
        {...(viewportStyle != null ? ({ style: viewportStyle } as Record<string, unknown>) : null)}
      >
        <ToastList viewportName={viewportName} />
      </Toast.Viewport>
    </Toast>
  );
}
