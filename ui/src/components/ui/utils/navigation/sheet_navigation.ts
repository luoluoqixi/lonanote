import { router } from "expo-router";

export function dismissSheet() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.back();
}
