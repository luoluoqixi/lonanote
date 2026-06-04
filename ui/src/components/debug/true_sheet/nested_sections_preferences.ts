import { useSyncExternalStore } from "react";

let debugSectionsAsNestedSheets = false;
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
