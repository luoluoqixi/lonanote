import type { ComponentType } from "react";

import type {
  DialogId,
  DialogJsonValue,
  DialogPayloadMap,
  DialogWindowResultMap,
} from "./dialog_types";
import { registerSettingsDialogRenderer } from "./settings_dialog_renderer";

export type DialogRendererProps<TDialogId extends DialogId = DialogId> = {
  payload: DialogPayloadMap[TDialogId];
  onComplete: (result?: DialogWindowResultMap[TDialogId] | DialogJsonValue) => void;
};

const renderers = new Map<DialogId, ComponentType<DialogRendererProps<any>>>();
registerSettingsDialogRenderer(renderers);

export function registerDialogRenderer(
  dialogId: DialogId,
  renderer: ComponentType<DialogRendererProps<any>>,
): void {
  if (renderers.has(dialogId)) throw new Error(`Dialog renderer 重复注册：${dialogId}`);
  renderers.set(dialogId, renderer);
}

export function getDialogRenderer(
  dialogId: DialogId,
): ComponentType<DialogRendererProps<any>> | undefined {
  return renderers.get(dialogId);
}
