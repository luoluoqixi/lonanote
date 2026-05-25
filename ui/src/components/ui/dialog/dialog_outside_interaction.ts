import { isWeb } from "@/api/common/platform";

const TAURI_DRAG_REGION_SELECTOR = "[data-tauri-drag-region]";

type ClosestCapableTarget = {
  closest: (selector: string) => unknown;
};

type OutsideInteractionEvent = {
  preventDefault: () => void;
  detail?: {
    originalEvent?: {
      target?: unknown;
    };
  };
};

function isClosestCapableTarget(target: unknown): target is ClosestCapableTarget {
  return (
    typeof target === "object" &&
    target !== null &&
    "closest" in target &&
    typeof (target as { closest?: unknown }).closest === "function"
  );
}

function isTauriDragRegionTarget(target: unknown): boolean {
  return isClosestCapableTarget(target) && target.closest(TAURI_DRAG_REGION_SELECTOR) !== null;
}

function preventDialogDismissForDragRegion(event: OutsideInteractionEvent): void {
  if (!isWeb()) {
    return;
  }

  const target = event.detail?.originalEvent?.target;
  if (isTauriDragRegionTarget(target)) {
    event.preventDefault();
  }
}

export { preventDialogDismissForDragRegion, isTauriDragRegionTarget, TAURI_DRAG_REGION_SELECTOR };
export type { OutsideInteractionEvent };
