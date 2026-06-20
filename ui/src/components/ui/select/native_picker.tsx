// Web 端原生 Picker 空实现
// iOS/Android 的真实现由 native_picker.ios.tsx / native_picker.android.tsx 提供
import React from "react";

/** Web 端永不渲染（shouldRenderNativePicker 恒为 false） */
export const NativePickerDialog: React.FC<any> = () => null;

/** Web 端永不渲染（shouldRenderNativeIosPicker 恒为 false） */
export type NativePickerSwiftUIHandle = {
  open: () => void;
};

export const NativePickerSwiftUI = React.forwardRef<NativePickerSwiftUIHandle, any>(() => null);
