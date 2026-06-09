import { Button } from "react-native";

import { useTrueSheetStackHost } from "./stack_context";

/** 原生 Stack `headerRight`：关闭当前 True Sheet。 */
export function TrueSheetStackHeaderCloseButton({ title }: { title?: string }) {
  const { onRequestClose } = useTrueSheetStackHost();
  const titleText = title ?? "Close";
  return <Button aria-label={titleText} onPress={onRequestClose} title={titleText} />;
}
