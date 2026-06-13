// 调试 Sheet 模式切换事件（独立文件，避免 require cycle）
import { DeviceEventEmitter } from "react-native";

export type SheetMode = "native" | "trueSheet";

export const DEBUG_SHEET_MODE_SWITCH_EVENT = "lonanote.debug-sheet.mode-switch";

/** 全局 toggle 事件（NativeSheet 模式时由 DebugSheetHost 响应） */
export const DEBUG_SHEET_TOGGLE_EVENT = "lonanote.debug-sheet.toggle";

// 运行时模式状态
let currentMode: SheetMode = "trueSheet";

export function getSheetMode(): SheetMode {
  return currentMode;
}

export function setSheetMode(mode: SheetMode) {
  currentMode = mode;
}

/** 切换到 TrueSheet 模式 */
export function switchDebugSheetToTrueSheet() {
  setSheetMode("trueSheet");
  DeviceEventEmitter.emit(DEBUG_SHEET_MODE_SWITCH_EVENT, "trueSheet");
}

/** 切换到 NativeSheet 模式 */
export function switchDebugSheetToNative() {
  setSheetMode("native");
  DeviceEventEmitter.emit(DEBUG_SHEET_MODE_SWITCH_EVENT, "native");
}

/** 发出 toggle 事件 */
export function emitDebugSheetToggle() {
  DeviceEventEmitter.emit(DEBUG_SHEET_TOGGLE_EVENT);
}
