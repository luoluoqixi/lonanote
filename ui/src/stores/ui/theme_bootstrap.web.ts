import { uiPreferences } from "./ui_preferences";

const LIGHT_WINDOW_BACKGROUND = "#F5F5F5";
const DARK_WINDOW_BACKGROUND = "#18181B";

type BootstrappedColorScheme = "light" | "dark";

let applied = false;

function resolveBootstrappedColorScheme(themeMode: "light" | "dark" | "system"): "light" | "dark" {
  if (themeMode !== "system") {
    return themeMode;
  }

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

function getBootstrapBackground(colorScheme: BootstrappedColorScheme): string {
  return colorScheme === "dark" ? DARK_WINDOW_BACKGROUND : LIGHT_WINDOW_BACKGROUND;
}

export function readBootstrappedColorScheme(): BootstrappedColorScheme {
  const themeMode = uiPreferences.getPreferences().appearance.themeMode;
  return resolveBootstrappedColorScheme(themeMode);
}

export function applyThemeBootstrap(): BootstrappedColorScheme | undefined {
  if (applied || typeof document === "undefined") {
    return undefined;
  }

  const colorScheme = readBootstrappedColorScheme();
  const backgroundColor = getBootstrapBackground(colorScheme);
  const rootElement = document.documentElement;
  const mountElement = document.getElementById("root") ?? document.getElementById("expo-root");

  rootElement.classList.toggle("dark", colorScheme === "dark");
  rootElement.style.colorScheme = colorScheme;
  rootElement.style.backgroundColor = backgroundColor;

  if (document.body) {
    document.body.style.backgroundColor = backgroundColor;
  }

  if (mountElement instanceof HTMLElement) {
    mountElement.style.backgroundColor = backgroundColor;
  }

  applied = true;
  return colorScheme;
}
