import { isDesktop } from "@/api/common/platform";
import { saveDocuments } from "@/components/app_menu/app_menu_actions";
import {
  getActiveSaveableDocumentId,
  getSaveableDocumentIds,
} from "@/components/app_menu/app_menu_model";
import { saveCoordinator } from "@/components/editor/controllers";
import { editorWindowService } from "@/components/editor/controllers/editor_window_service";
import { useToast } from "@/hooks/ui";
import { editorStore } from "@/stores/editor";

import { useEditorSelector } from "./use_editor_selector";

export function useAppSaveActions() {
  const availability = useEditorSelector((state) => {
    const ids = getSaveableDocumentIds(state, isDesktop());
    const active = getActiveSaveableDocumentId(state, isDesktop());
    return { canSave: Boolean(active && ids.includes(active)), canSaveAll: ids.length > 0 };
  });
  const { toast } = useToast();
  const save = async (all: boolean) => {
    if (all && editorWindowService.isRemote()) {
      try {
        await editorWindowService.requestOwner("save-all", null);
      } catch (error) {
        toast.error("保存失败", { description: String(error) });
      }
      return;
    }
    const state = editorStore.getState();
    const allowed = getSaveableDocumentIds(state, isDesktop());
    const activeId = getActiveSaveableDocumentId(state, isDesktop());
    const failures = await saveDocuments(
      all ? allowed : allowed.filter((id) => id === activeId),
      saveCoordinator.requestSaveDocument,
    );
    if (failures.length) toast.error("保存失败", { description: failures.join("\n") });
  };
  return {
    ...availability,
    saveActive: () => save(false),
    saveAll: () => save(true),
  };
}
