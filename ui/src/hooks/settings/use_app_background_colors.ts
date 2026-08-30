import {
  type AppBackgroundColors,
  useAppBackgroundColors as useRnUiKitAppBackgroundColors,
} from "rn-ui-kit";

export type { AppBackgroundColors };

export function useAppBackgroundColors(): AppBackgroundColors {
  return useRnUiKitAppBackgroundColors();
}
