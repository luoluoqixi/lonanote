import { useEffect, useRef, useState } from "react";

import { workspaceFile } from "@/api/commands/workspace";
import { ensureNewNoteFileExtension } from "@/api/common";
import { getErrorMessage } from "@/api/common/error_message";
import { getDefaultWorkspaceEntryName } from "@/api/common/utils/workspace_entry_name";
import type { CreateWorkspaceEntryKind } from "@/components/workspaces/workspace_explorer/create_workspace_entry_sheet";
import { useToast } from "@/hooks/ui";

import { useWorkspaceFileActions } from "./use_workspace_file_actions";

/** 文件菜单复用文件浏览器的命名弹窗，确认之前不写入文件。 */
export function useWorkspaceEntryCreation(workspaceId: string | null) {
  const { toast } = useToast();
  const actions = useWorkspaceFileActions();
  const [form, setForm] = useState({
    open: false,
    entryKind: "note" as CreateWorkspaceEntryKind,
    name: "",
    parentPath: "",
  });
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const submitting = useRef(false);
  useEffect(() => {
    setForm((current) => ({ ...current, open: false }));
    return () => {
      request.current++;
    };
  }, [workspaceId]);

  const open = async (entryKind: CreateWorkspaceEntryKind, parentPath: string) => {
    if (!workspaceId || submitting.current) return;
    const token = ++request.current;
    try {
      const entries = await workspaceFile.list(workspaceId, parentPath);
      if (token !== request.current) return;
      setForm({
        open: true,
        entryKind,
        parentPath,
        name: getDefaultWorkspaceEntryName(entries, entryKind),
      });
    } catch (error) {
      if (token === request.current) toast.error(getErrorMessage(error, "无法读取目标文件夹"));
    }
  };
  const submit = async () => {
    if (!workspaceId || !form.open || submitting.current) return;
    const name = form.name.trim();
    if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
      toast.error(name ? "名称不能包含路径分隔符" : "请输入名称");
      return;
    }
    const token = request.current;
    submitting.current = true;
    setBusy(true);
    try {
      const result = await actions.createEntry({
        workspaceId,
        parentPath: form.parentPath,
        kind: form.entryKind,
        name: form.entryKind === "note" ? ensureNewNoteFileExtension(name) : name,
      });
      if (token !== request.current || !result.succeededPaths.length) return;
      setForm((current) => ({ ...current, open: false }));
      toast.success(form.entryKind === "note" ? "笔记已创建" : "文件夹已创建");
    } catch (error) {
      if (token === request.current) toast.error(getErrorMessage(error, "创建失败"));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return {
    open,
    busy,
    sheetProps: {
      ...form,
      isCreating: busy,
      onNameChange: (name: string) => setForm((current) => ({ ...current, name })),
      onOpenChange: (open: boolean) => {
        if (!submitting.current) setForm((current) => ({ ...current, open }));
      },
      onSubmit: () => {
        void submit();
      },
    },
  };
}
