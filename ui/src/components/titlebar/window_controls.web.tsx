import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { os } from "@/api/common";
import type { OSType } from "@/api/common";

let cachedOs: OSType | null = null;

type WindowButtonKind = "close" | "default";
type ButtonInteractionState = "active" | "hover" | "idle";
type TitlebarStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
  appRegion?: "drag" | "no-drag";
};

function getOsType(): OSType {
  if (cachedOs === null) {
    cachedOs = os();
  }
  return cachedOs;
}

const noDragStyle: TitlebarStyle = {
  WebkitAppRegion: "no-drag",
  appRegion: "no-drag",
};

const windowsControlsStyle: CSSProperties = {
  backgroundColor: "transparent",
  display: "flex",
  height: "100%",
  position: "absolute",
  right: 0,
  top: 0,
};

const windowsControlsHoverDisabledStyle: CSSProperties = {
  pointerEvents: "none",
};

const windowsButtonBaseStyle: TitlebarStyle = {
  ...noDragStyle,
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "color-mix(in srgb, var(--foreground) 88%, transparent)",
  cursor: "default",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  outline: "none",
  padding: 0,
  transition: "background-color 0.1s ease, color 0.1s ease",
  width: 46,
};

const macControlsStyle: TitlebarStyle = {
  ...noDragStyle,
  alignItems: "center",
  display: "flex",
  gap: 8,
  height: "100%",
  left: 0,
  padding: "0 10px",
  position: "absolute",
  top: 0,
};

const macDotBaseStyle: TitlebarStyle = {
  ...noDragStyle,
  alignItems: "center",
  border: "none",
  borderRadius: "50%",
  color: "rgba(0, 0, 0, 0.6)",
  cursor: "default",
  display: "flex",
  height: 14,
  justifyContent: "center",
  outline: "none",
  padding: 0,
  transition: "filter 0.1s ease",
  width: 14,
};

function getWindowsButtonStyle(
  kind: WindowButtonKind,
  interaction: ButtonInteractionState,
  hoverDisabled: boolean,
): TitlebarStyle {
  if (hoverDisabled || interaction === "idle") {
    return windowsButtonBaseStyle;
  }

  if (kind === "close") {
    return {
      ...windowsButtonBaseStyle,
      backgroundColor: interaction === "active" ? "#f1717c" : "#e81123",
      color: "#ffffff",
    };
  }

  return {
    ...windowsButtonBaseStyle,
    backgroundColor: interaction === "active" ? "rgba(0, 0, 0, 0.18)" : "rgba(0, 0, 0, 0.1)",
    color: "var(--foreground)",
  };
}

function WindowsButton({
  children,
  hoverDisabled,
  kind = "default",
  onClick,
  title,
}: {
  children: ReactNode;
  hoverDisabled: boolean;
  kind?: WindowButtonKind;
  onClick: () => void;
  title: string;
}) {
  const [interaction, setInteraction] = useState<ButtonInteractionState>("idle");

  useEffect(() => {
    if (hoverDisabled) {
      setInteraction("idle");
    }
  }, [hoverDisabled]);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => {
        if (!hoverDisabled) setInteraction("active");
      }}
      onMouseEnter={() => {
        if (!hoverDisabled) setInteraction("hover");
      }}
      onMouseLeave={() => setInteraction("idle")}
      onMouseUp={() => {
        if (!hoverDisabled) setInteraction("hover");
      }}
      style={getWindowsButtonStyle(kind, interaction, hoverDisabled)}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function MacDotButton({
  backgroundColor,
  children,
  onClick,
  title,
}: {
  backgroundColor: string;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseUp={() => setActive(false)}
      style={{
        ...macDotBaseStyle,
        backgroundColor,
        filter: active ? "brightness(0.85)" : undefined,
      }}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

const MinimizeIcon = () => (
  <svg aria-hidden="false" width="12" height="12" viewBox="0 0 12 12">
    <rect fill="currentColor" width="10" height="1" x="1" y="6"></rect>
  </svg>
);

const MaximizeIcon = () => (
  <svg aria-hidden="false" width="12" height="12" viewBox="0 0 12 12">
    <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor"></rect>
  </svg>
);

const RestoreIcon = () => (
  <svg aria-hidden="false" width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 3.5H8.5V10.5H1.5V3.5Z" stroke="currentColor"></path>{" "}
    <path d="M4 2H10V8H9V9H11V1H3V3H4V2Z" fill="currentColor"></path>
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="false" width="12" height="12" viewBox="0 0 12 12">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10.052 10.968 1.03 1.93l.849-.848 9.023 9.037-.849.848Z"
    ></path>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M1.023 10.112 10.06 1.09l.848.85-9.037 9.023-.848-.85Z"
    ></path>
  </svg>
);

const MacCloseIcon = () => (
  <svg width="6" height="6" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15.7522 4.44381L11.1543 9.04165L15.7494 13.6368C16.0898 13.9771 16.078 14.5407 15.724 14.8947L13.8907 16.728C13.5358 17.0829 12.9731 17.0938 12.6328 16.7534L8.03766 12.1583L3.44437 16.7507C3.10402 17.091 2.54132 17.0801 2.18645 16.7253L0.273257 14.8121C-0.0807018 14.4572 -0.0925004 13.8945 0.247845 13.5542L4.84024 8.96087L0.32499 4.44653C-0.0153555 4.10619 -0.00355681 3.54258 0.350402 3.18862L2.18373 1.35529C2.53859 1.00042 3.1013 0.989533 3.44164 1.32988L7.95689 5.84422L12.5556 1.24638C12.8951 0.906035 13.4587 0.917833 13.8126 1.27179L15.7267 3.18589C16.0807 3.53985 16.0925 4.10346 15.7522 4.44381Z"
      fill="currentColor"
    />
  </svg>
);

const MacMinIcon = () => (
  <svg width="8" height="2" viewBox="0 0 17 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.47211 1.18042H15.4197C15.8052 1.18042 16.1179 1.50551 16.1179 1.90769V3.73242C16.1179 4.13387 15.8052 4.80006 15.4197 4.80006H1.47211C1.08665 4.80006 0.773926 4.47497 0.773926 4.07278V1.90769C0.773926 1.50551 1.08665 1.18042 1.47211 1.18042Z"
      fill="currentColor"
    />
  </svg>
);

const MacFullIcon = () => (
  <svg width="6" height="6" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.53068 0.433838L15.0933 12.0409C15.0933 12.0409 15.0658 5.35028 15.0658 4.01784C15.0658 1.32095 14.1813 0.433838 11.5378 0.433838C10.6462 0.433838 3.53068 0.433838 3.53068 0.433838ZM12.4409 15.5378L0.87735 3.93073C0.87735 3.93073 0.905794 10.6214 0.905794 11.9538C0.905794 14.6507 1.79024 15.5378 4.43291 15.5378C5.32535 15.5378 12.4409 15.5378 12.4409 15.5378Z"
      fill="currentColor"
    />
  </svg>
);

const MacExpandIcon = () => (
  <svg width="8" height="8" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.5308 9.80147H10.3199V15.0095C10.3199 15.3949 9.9941 15.7076 9.59265 15.7076H7.51555C7.11337 15.7076 6.78828 15.3949 6.78828 15.0095V9.80147H1.58319C1.19774 9.80147 0.88501 9.47638 0.88501 9.07419V6.90619C0.88501 6.50401 1.19774 6.17892 1.58319 6.17892H6.78828V1.06183C6.78828 0.676375 7.11337 0.363647 7.51555 0.363647H9.59265C9.9941 0.363647 10.3199 0.676375 10.3199 1.06183V6.17892H15.5308C15.9163 6.17892 16.229 6.50401 16.229 6.90619V9.07419C16.229 9.47638 15.9163 9.80147 15.5308 9.80147Z"
      fill="currentColor"
    />
  </svg>
);

function WindowsControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  // 在 Windows 上使用鼠标拖拽标题栏中间区域, 从最大化状态返回时, 有可能不正确的 hover 到最右侧按钮
  const [isResizeTransitioning, setIsResizeTransitioning] = useState(false);

  const appWindow = useMemo(() => getCurrentWindow(), []);
  const resizeTransitionTimeoutRef = useRef<number | undefined>(undefined);

  const updateMaximized = useCallback(async () => {
    setIsMaximized(await appWindow.isMaximized());
  }, [appWindow]);

  const markResizeTransition = useCallback(() => {
    setIsResizeTransitioning(true);

    if (resizeTransitionTimeoutRef.current !== undefined) {
      window.clearTimeout(resizeTransitionTimeoutRef.current);
    }

    resizeTransitionTimeoutRef.current = window.setTimeout(() => {
      setIsResizeTransitioning(false);
      resizeTransitionTimeoutRef.current = undefined;
    }, 160);
  }, []);

  // 延迟调用, 否则在窗口重新打开时会有 hover 状态残留
  const delayedCallback = useCallback((fn: () => void) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(fn, 60);
  }, []);

  const delayedClose = useCallback(() => {
    delayedCallback(() => {
      appWindow.close();
    });
  }, [appWindow, delayedCallback]);
  const delayedMinimize = useCallback(() => {
    delayedCallback(() => {
      appWindow.minimize();
    });
  }, [appWindow, delayedCallback]);
  const delayedMaximize = useCallback(() => {
    delayedCallback(() => {
      appWindow.toggleMaximize();
    });
  }, [appWindow, delayedCallback]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    appWindow.isMaximized().then((v) => {
      if (!cancelled) setIsMaximized(v);
    });

    appWindow
      .onResized(() => {
        markResizeTransition();
        void updateMaximized();
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      cancelled = true;
      if (resizeTransitionTimeoutRef.current !== undefined) {
        window.clearTimeout(resizeTransitionTimeoutRef.current);
      }
      unlisten?.();
    };
  }, [appWindow, markResizeTransition, updateMaximized]);

  return (
    <div
      style={
        isResizeTransitioning
          ? { ...windowsControlsStyle, ...windowsControlsHoverDisabledStyle }
          : windowsControlsStyle
      }
    >
      <WindowsButton hoverDisabled={isResizeTransitioning} onClick={delayedMinimize} title="最小化">
        <MinimizeIcon />
      </WindowsButton>
      <WindowsButton
        hoverDisabled={isResizeTransitioning}
        onClick={delayedMaximize}
        title={isMaximized ? "还原" : "最大化"}
      >
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </WindowsButton>
      <WindowsButton
        hoverDisabled={isResizeTransitioning}
        kind="close"
        onClick={delayedClose}
        title="关闭"
      >
        <CloseIcon />
      </WindowsButton>
    </div>
  );
}

function MacOSControls() {
  const [hovering, setHovering] = useState(false);
  const [altKey, setAltKey] = useState(false);

  const appWindow = useMemo(() => getCurrentWindow(), []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => e.key === "Alt" && setAltKey(true);
    const onUp = (e: KeyboardEvent) => e.key === "Alt" && setAltKey(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return (
    <div
      style={macControlsStyle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <MacDotButton backgroundColor="#ff544d" onClick={() => appWindow.close()} title="关闭">
        {hovering && <MacCloseIcon />}
      </MacDotButton>
      <MacDotButton backgroundColor="#ffbd2e" onClick={() => appWindow.minimize()} title="最小化">
        {hovering && <MacMinIcon />}
      </MacDotButton>
      <MacDotButton
        backgroundColor="#28c93f"
        onClick={async () => {
          if (altKey) {
            appWindow.toggleMaximize();
          } else {
            const isFullscreen = await appWindow.isFullscreen();
            appWindow.setFullscreen(!isFullscreen);
          }
        }}
        title={altKey ? "最大化" : "全屏"}
      >
        {hovering && (altKey ? <MacExpandIcon /> : <MacFullIcon />)}
      </MacDotButton>
    </div>
  );
}

export function WindowControls() {
  const os = getOsType();
  return os === "macos" ? <MacOSControls /> : <WindowsControls />;
}
