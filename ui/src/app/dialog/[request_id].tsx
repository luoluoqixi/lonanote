import { useLocalSearchParams } from "expo-router";

import { getDialogRenderer } from "@/api/common/dialogs/dialog_content_registry";
import { DialogWindowHost } from "@/api/common/dialogs/dialog_window_host";

export default function DialogWindowRoute() {
  const { request_id } = useLocalSearchParams<{ request_id: string }>();
  return <DialogWindowHost requestId={request_id} resolveRenderer={getDialogRenderer} />;
}
