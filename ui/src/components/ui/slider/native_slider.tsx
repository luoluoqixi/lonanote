// Web 端原生 Slider 空实现（native = true 时返回 null）
import type { SliderProps } from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NativeSlider(_: SliderProps & { value?: number[] }) {
  return null;
}
