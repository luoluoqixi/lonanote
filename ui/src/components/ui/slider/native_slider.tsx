// Web 端原生 Slider 空实现（native = true 时返回 null）
import type { SliderProps } from "./types";

export function NativeSlider(_props: SliderProps & { value?: number[] }) {
  return null;
}
