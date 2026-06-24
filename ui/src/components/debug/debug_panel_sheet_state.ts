import { router } from "expo-router";
import { useSyncExternalStore } from "react";

import {
  dismissTrueSheet,
  presentTrueSheet,
  resizeTrueSheet,
} from "@/components/ui/sheet/native_sheet/true_sheet/api";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_toast_layout";

import { DEBUG_HOME_HREF, type DebugTabKey, getDebugFullPageHref } from "./routes";

/** 嵌套分区 TrueSheet 三档高度（与 `presentTrueSheet` 的 detentIndex 一一对应）。 */
export const DEBUG_NESTED_SECTION_SHEET_DETENTS = [0.5, 0.75, 1] as const;

export type DebugNestedSectionDetentLevel = 0 | 1 | 2;

export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN = 0 satisfies DebugNestedSectionDetentLevel;
export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX = 2 satisfies DebugNestedSectionDetentLevel;

const DEBUG_NESTED_SECTION_DETENT_LABELS = ["偏低 (50%)", "中等 (75%)", "全屏 (100%)"] as const;

function clampDebugNestedSectionDetentLevel(level: number): DebugNestedSectionDetentLevel {
  const rounded = Math.round(level);

  if (rounded <= DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN;
  }

  if (rounded >= DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX;
  }

  return rounded as DebugNestedSectionDetentLevel;
}

export function getDebugNestedSectionDetentLabel(level: DebugNestedSectionDetentLevel): string {
  return DEBUG_NESTED_SECTION_DETENT_LABELS[level];
}

let debugSectionsAsNestedSheets = false;
let debugNestedSectionDetentLevel: DebugNestedSectionDetentLevel = 0;
const preferenceListeners = new Set<() => void>();

function emitNestedSectionsPreferenceChange() {
  for (const listener of preferenceListeners) {
    listener();
  }
}

export function getDebugSectionsAsNestedSheets() {
  return debugSectionsAsNestedSheets;
}

export function setDebugSectionsAsNestedSheets(enabled: boolean) {
  if (debugSectionsAsNestedSheets === enabled) {
    return;
  }

  debugSectionsAsNestedSheets = enabled;
  emitNestedSectionsPreferenceChange();
}

export function getDebugNestedSectionDetentLevel(): DebugNestedSectionDetentLevel {
  return debugNestedSectionDetentLevel;
}

export function getDebugNestedSectionSnapPoint(
  level: DebugNestedSectionDetentLevel = debugNestedSectionDetentLevel,
) {
  return DEBUG_NESTED_SECTION_SHEET_DETENTS[level];
}

export function setDebugNestedSectionDetentLevel(level: number) {
  const clamped = clampDebugNestedSectionDetentLevel(level);

  if (debugNestedSectionDetentLevel === clamped) {
    return;
  }

  debugNestedSectionDetentLevel = clamped;
  emitNestedSectionsPreferenceChange();
}

function subscribeDebugSectionsPreference(listener: () => void) {
  preferenceListeners.add(listener);

  return () => {
    preferenceListeners.delete(listener);
  };
}

export function useDebugSectionsAsNestedSheets() {
  return useSyncExternalStore(
    subscribeDebugSectionsPreference,
    getDebugSectionsAsNestedSheets,
    getDebugSectionsAsNestedSheets,
  );
}

export function useDebugNestedSectionDetentLevel() {
  return useSyncExternalStore(
    subscribeDebugSectionsPreference,
    getDebugNestedSectionDetentLevel,
    getDebugNestedSectionDetentLevel,
  );
}

export const DEBUG_NATIVE_SHEET_NAME = "lonanote-debug";

let debugSheetOpen = false;
let debugSheetPosition = 0;
const debugPanelListeners = new Set<() => void>();

function emitDebugPanelChange() {
  for (const listener of debugPanelListeners) {
    listener();
  }
}

export function subscribeDebugPanelState(listener: () => void) {
  debugPanelListeners.add(listener);

  return () => {
    debugPanelListeners.delete(listener);
  };
}

export function getDebugPanelOpen() {
  return debugSheetOpen;
}

export function getDebugPanelPosition() {
  return debugSheetPosition;
}

export function setDebugPanelOpen(open: boolean) {
  if (debugSheetOpen === open) {
    return;
  }

  debugSheetOpen = open;
  emitDebugPanelChange();
}

export function setDebugPanelPosition(position: number) {
  if (debugSheetPosition === position) {
    return;
  }

  debugSheetPosition = position;
  emitDebugPanelChange();
}

const presentedDebugSectionSheets = new Set<DebugTabKey>();
let presentedDebugSectionSheetsSnapshot = new Set<DebugTabKey>();
const sectionSheetListeners = new Set<() => void>();

function emitSectionSheetChange() {
  for (const listener of sectionSheetListeners) {
    listener();
  }
}

function updatePresentedDebugSectionSheetsSnapshot() {
  presentedDebugSectionSheetsSnapshot = new Set(presentedDebugSectionSheets);
}

export function subscribeDebugSectionSheetState(listener: () => void) {
  sectionSheetListeners.add(listener);

  return () => {
    sectionSheetListeners.delete(listener);
  };
}

export function getPresentedDebugSectionSheets() {
  return presentedDebugSectionSheetsSnapshot;
}

let debugSectionSheetDismissVersion = 0;
const dismissVersionListeners = new Set<() => void>();

function emitDismissVersionChange() {
  for (const listener of dismissVersionListeners) {
    listener();
  }
}

export function getDebugSectionSheetDismissVersion() {
  return debugSectionSheetDismissVersion;
}

export function subscribeDebugSectionSheetDismiss(listener: () => void) {
  dismissVersionListeners.add(listener);

  return () => {
    dismissVersionListeners.delete(listener);
  };
}

export function getDebugSectionSheetName(key: DebugTabKey) {
  return `lonanote-debug-section-${key}`;
}

export function getDebugSectionOverlayPortalHost(key: DebugTabKey) {
  return `${DEBUG_OVERLAY_PORTAL_HOST}:section:${key}`;
}

export function openDebugSectionSheet(
  key: DebugTabKey,
  detentIndex = getDebugNestedSectionDetentLevel(),
) {
  setDebugNestedSectionDetentLevel(detentIndex);
  if (presentedDebugSectionSheets.has(key)) {
    return;
  }

  return presentTrueSheet(getDebugSectionSheetName(key), detentIndex).then(() => {
    presentedDebugSectionSheets.add(key);
    updatePresentedDebugSectionSheetsSnapshot();
    emitSectionSheetChange();
  });
}

export function cleanupDebugSectionSheet(key: DebugTabKey) {
  const deleted = presentedDebugSectionSheets.delete(key);
  if (!deleted) {
    return;
  }

  debugSectionSheetDismissVersion += 1;
  updatePresentedDebugSectionSheetsSnapshot();
  emitSectionSheetChange();
  emitDismissVersionChange();
}

export function closeDebugSectionSheet(key: DebugTabKey) {
  presentedDebugSectionSheets.delete(key);
  updatePresentedDebugSectionSheetsSnapshot();
  emitSectionSheetChange();
  return dismissTrueSheet(getDebugSectionSheetName(key));
}

export function resizeDebugSectionSheets(detentIndex: number = getDebugNestedSectionDetentLevel()) {
  setDebugNestedSectionDetentLevel(detentIndex);
  const presentedKeys = [...presentedDebugSectionSheets];

  if (presentedKeys.length === 0) {
    return;
  }

  return Promise.all(
    presentedKeys.map((key) =>
      resizeTrueSheet(getDebugSectionSheetName(key), detentIndex).catch(() => undefined),
    ),
  );
}

function dismissAllDebugSectionSheets() {
  if (presentedDebugSectionSheets.size === 0) {
    return;
  }

  const presentedKeys = [...presentedDebugSectionSheets];
  let changed = false;
  for (const key of presentedKeys) {
    presentedDebugSectionSheets.delete(key);
    debugSectionSheetDismissVersion += 1;
    changed = true;
  }

  if (changed) {
    updatePresentedDebugSectionSheetsSnapshot();
    emitSectionSheetChange();
    emitDismissVersionChange();
  }

  return Promise.all(
    presentedKeys.map((key) =>
      dismissTrueSheet(getDebugSectionSheetName(key)).catch(() => undefined),
    ),
  );
}

export async function openDebugSection(key: DebugTabKey) {
  if (!getDebugSectionsAsNestedSheets()) {
    return false;
  }

  await openDebugSectionSheet(key, getDebugNestedSectionDetentLevel());
  return true;
}

export function openDebugPanel(detentIndex = 0) {
  debugSheetPosition = detentIndex;
  debugSheetOpen = true;
  emitDebugPanelChange();
}

export function closeDebugPanel() {
  debugSheetOpen = false;
  void dismissAllDebugSectionSheets();
  emitDebugPanelChange();
}

export function markDebugPanelClosed() {
  debugSheetOpen = false;
  emitDebugPanelChange();
}

export function toggleDebugPanel() {
  if (debugSheetOpen) {
    closeDebugPanel();
    return;
  }

  openDebugPanel();
}

export function switchDebugPanelToFullPage() {
  closeDebugPanel();
  router.push(DEBUG_HOME_HREF);
}

export function openDebugFullPageSection(key: DebugTabKey) {
  if (getDebugSectionsAsNestedSheets()) {
    void openDebugSectionSheet(key, getDebugNestedSectionDetentLevel());
    return;
  }

  closeDebugPanel();
  router.push(getDebugFullPageHref(key));
}

export function switchDebugPanelToNativeSheet() {
  if (router.canGoBack()) {
    router.back();
  }

  openDebugPanel();
}
