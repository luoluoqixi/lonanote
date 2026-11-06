import { isDesktop } from "@/api/common/platform";
import { saveDocuments } from "@/components/app_menu/app_menu_actions";
import {
  getActiveSaveableDocumentId,
  getSaveableDocumentIds,
} from "@/components/app_menu/app_menu_model";
import { saveCoordinator } from "@/components/editor/controllers";
import { useToast } from "@/hooks/ui";

import { useEditorSession } from "./use_editor_session";

export function useAppSaveActions() {
  const session = useEditorSession();
  const { toast } = useToast();
  const ids = getSaveableDocumentIds(session, isDesktop());
  const active = getActiveSaveableDocumentId(session, isDesktop());
  const save = async (all: boolean) => {
    const state = session.getSnapshot();
    const allowed = getSaveableDocumentIds(state, isDesktop());
    const activeId = getActiveSaveableDocumentId(state, isDesktop());
    const failures = await saveDocuments(
      all ? allowed : allowed.filter((id) => id === activeId),
      saveCoordinator.requestSaveDocument,
    );
    if (failures.length) toast.error("保存失败", { description: failures.join("\n") });
  };
  return {
    canSave: Boolean(active && ids.includes(active)),
    canSaveAll: ids.length > 0,
    saveActive: () => save(false),
    saveAll: () => save(true),
  };
}
