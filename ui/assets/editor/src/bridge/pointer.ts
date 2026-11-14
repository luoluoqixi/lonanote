export type EditorPointerPayload = {
  type: "pointerdown" | "pointerup" | "pointercancel";
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
};

export function isEditorPointerPayload(value: unknown): value is EditorPointerPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as EditorPointerPayload;
  return (
    ["pointerdown", "pointerup", "pointercancel"].includes(payload.type) &&
    Number.isInteger(payload.button) &&
    Number.isFinite(payload.clientX) &&
    Number.isFinite(payload.clientY) &&
    Number.isInteger(payload.pointerId) &&
    typeof payload.pointerType === "string"
  );
}

/** iframe 内的事件不会冒泡到宿主；只转发菜单关闭所需的 pointer 生命周期。 */
export function installEditorPointerEvents(
  ownerDocument: Document,
  emit: (payload: EditorPointerPayload) => void,
): () => void {
  const types = ["pointerdown", "pointerup", "pointercancel"] as const;
  const onPointer = (event: PointerEvent) => {
    emit({
      type: event.type as EditorPointerPayload["type"],
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    });
  };
  for (const type of types) ownerDocument.addEventListener(type, onPointer, true);
  return () => {
    for (const type of types) ownerDocument.removeEventListener(type, onPointer, true);
  };
}
