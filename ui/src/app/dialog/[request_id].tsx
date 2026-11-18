import { useLocalSearchParams } from "expo-router";

import "@/api/common/dialogs/business_dialog_renderers";
import "@/api/common/dialogs/confirm_dialog_renderer";
import { DialogWindowHost } from "@/api/common/dialogs/dialog_window_host";
import "@/api/common/dialogs/workspace_select_dialog_renderer";

export default function DialogWindowRoute() {
  const { request_id } = useLocalSearchParams<{ request_id: string }>();
  return <DialogWindowHost requestId={request_id} />;
}
