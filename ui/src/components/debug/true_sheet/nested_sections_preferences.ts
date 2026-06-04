import { useSyncExternalStore } from "react";

import {
  type DebugNestedSectionDetentLevel,
  clampDebugNestedSectionDetentLevel,
} from "./nested_section_sheet_layout";

let debugSectionsAsNestedSheets = false;
let debugNestedSectionDetentLevel: DebugNestedSectionDetentLevel = 0;
const listeners = new Set<() => void>();

function emitNestedSectionsPreferenceChange() {
  for (const listener of listeners) {
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

export function setDebugNestedSectionDetentLevel(level: number) {
  const clamped = clampDebugNestedSectionDetentLevel(level);
  if (debugNestedSectionDetentLevel === clamped) {
    return;
  }

  debugNestedSectionDetentLevel = clamped;
  emitNestedSectionsPreferenceChange();
}

function subscribeDebugSectionsAsNestedSheets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDebugSectionsAsNestedSheets() {
  return useSyncExternalStore(
    subscribeDebugSectionsAsNestedSheets,
    getDebugSectionsAsNestedSheets,
    getDebugSectionsAsNestedSheets,
  );
}

export function useDebugNestedSectionDetentLevel() {
  return useSyncExternalStore(
    subscribeDebugSectionsAsNestedSheets,
    getDebugNestedSectionDetentLevel,
    getDebugNestedSectionDetentLevel,
  );
}
