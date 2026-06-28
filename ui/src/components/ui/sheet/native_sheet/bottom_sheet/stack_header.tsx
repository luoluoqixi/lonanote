import { Button } from "@/components/ui/button";

import { useBottomSheetStackHost } from "./stack_context";

/** BottomSheet Stack `headerRight`：关闭当前 BottomSheet。 */
export function BottomSheetStackHeaderCloseButton({ title }: { title?: string }) {
  const { onRequestClose } = useBottomSheetStackHost();
  const titleText = title ?? "Close";
  return <Button aria-label={titleText} native onPress={onRequestClose} title={titleText} />;
}
