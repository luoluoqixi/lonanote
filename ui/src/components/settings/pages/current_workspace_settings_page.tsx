/* eslint-disable quote-props */
import { useEffect, useRef, useState } from "react";
import {
  NativeListButtonItem,
  NativeListItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  NativeListTextAreaItem,
  type SelectOption,
  toSwiftUIHexColor,
  useUiTheme,
} from "rn-ui-kit";
import { confirmNative } from "rn-ui-kit";

import { type WorkspaceSettings, workspace } from "@/api/commands/workspace";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId, useWorkspaceState } from "@/hooks/workspace";
import { selectWorkspaceDirectory } from "@/hooks/workspace/use_workspace_directory_picker";

import { SettingsList } from "../settings_list";
import { useSettingsPresentation } from "../use_settings_presentation";

const HISTORY_SNAPSHOT_COUNT_OPTIONS: SelectOption[] = [
  { label: "不保留", value: "0" },
  { label: "5 个", value: "5" },
  { label: "10 个", value: "10" },
  { label: "20 个", value: "20" },
  { label: "50 个", value: "50" },
  { label: "100 个", value: "100" },
];

const HISTORY_SNAPSHOT_INTERVAL_OPTIONS: SelectOption[] = [
  { label: "每次保存", value: "0" },
  { label: "1 分钟", value: "1" },
  { label: "5 分钟（默认）", value: "5" },
  { label: "10 分钟", value: "10" },
  { label: "30 分钟", value: "30" },
  { label: "60 分钟", value: "60" },
];

type CurrentWorkspaceSettingsPageProps = {
  tracksNavigationBarScrollEdge?: boolean;
};

type ResettableWorkspaceSetting = "customIgnore" | "uploadImagePath" | "uploadAttachmentPath";

const RESETTABLE_WORKSPACE_SETTING_LABELS: Record<ResettableWorkspaceSetting, string> = {
  customIgnore: "自定义忽略规则",
  uploadAttachmentPath: "附件目录",
  uploadImagePath: "图片目录",
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function areSettingsEqual(
  leftSettings: WorkspaceSettings | null,
  rightSettings: WorkspaceSettings | null,
): boolean {
  return JSON.stringify(leftSettings) === JSON.stringify(rightSettings);
}

export function CurrentWorkspaceSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: CurrentWorkspaceSettingsPageProps) {
  const presentation = useSettingsPresentation();
  const workspaceId = useCurrentWorkspaceId();
  const { state: currentWorkspace } = useWorkspaceState(presentation.desktop ? workspaceId : null);
  const activeWorkspaceIdRef = useRef(workspaceId);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<WorkspaceSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(workspaceId));
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isDirty = !areSettingsEqual(settings, savedSettings);
  const isEditingDisabled = isLoading || isSaving || isResetting;
  const theme = useUiTheme();
  const { toast } = useToast();
  const destructiveColor = toSwiftUIHexColor(theme.danger) ?? theme.danger;

  useEffect(() => {
    activeWorkspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    const requestId = ++loadRequestIdRef.current;

    if (!workspaceId) {
      setSettings(null);
      setSavedSettings(null);
      setError(null);
      setIsLoading(false);
      setIsSaving(false);
      setIsResetting(false);
      return;
    }

    setSettings(null);
    setSavedSettings(null);
    setError(null);
    setIsLoading(true);
    setIsSaving(false);
    setIsResetting(false);

    void workspace
      .getSettings(workspaceId)
      .then((nextSettings) => {
        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        setSettings(nextSettings);
        setSavedSettings(nextSettings);
      })
      .catch((nextError) => {
        if (requestId === loadRequestIdRef.current) {
          setError(getErrorMessage(nextError, "工作区设置加载失败"));
        }
      })
      .finally(() => {
        if (requestId === loadRequestIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [workspaceId]);

  const updateSettings = (updater: (currentSettings: WorkspaceSettings) => WorkspaceSettings) => {
    setSettings((currentSettings) => {
      if (!currentSettings) {
        return currentSettings;
      }

      return updater(currentSettings);
    });
    setError(null);
  };

  const saveSettings = () => {
    if (!workspaceId || !settings || isSaving) {
      return;
    }

    if (!isDirty) {
      toast.info("没有需要保存的更改");
      return;
    }

    const targetWorkspaceId = workspaceId;
    const settingsToSave = settings;
    const requestId = ++saveRequestIdRef.current;
    setError(null);
    setIsSaving(true);

    void workspace
      .setSettings(targetWorkspaceId, settingsToSave)
      .then((nextSettings) => {
        if (
          requestId !== saveRequestIdRef.current ||
          activeWorkspaceIdRef.current !== targetWorkspaceId
        ) {
          return;
        }

        setSettings(nextSettings);
        setSavedSettings(nextSettings);
      })
      .catch((nextError) => {
        if (
          requestId === saveRequestIdRef.current &&
          activeWorkspaceIdRef.current === targetWorkspaceId
        ) {
          setError(getErrorMessage(nextError, "工作区设置保存失败"));
        }
      })
      .finally(() => {
        if (
          requestId === saveRequestIdRef.current &&
          activeWorkspaceIdRef.current === targetWorkspaceId
        ) {
          setIsSaving(false);
        }
      });
  };

  const resetSingleSetting = async (setting: ResettableWorkspaceSetting) => {
    if (!workspaceId || !settings || isEditingDisabled) {
      return;
    }

    const label = RESETTABLE_WORKSPACE_SETTING_LABELS[setting];
    const confirmed = await confirmNative({
      buttons: [
        { key: "cancel", style: "cancel", text: "取消" },
        { key: "reset", style: "destructive", text: "恢复默认" },
      ],
      message: `这会将“${label}”恢复为默认值。是否继续？`,
      title: "恢复默认设置",
    });

    if (confirmed !== "reset" || activeWorkspaceIdRef.current !== workspaceId) {
      return;
    }

    setError(null);
    setIsResetting(true);

    try {
      const defaultSettings = await workspace.getDefaultSettings();

      if (activeWorkspaceIdRef.current !== workspaceId) {
        return;
      }

      updateSettings((currentSettings) => ({
        ...currentSettings,
        [setting]: defaultSettings[setting],
      }));
      toast.success(`${label}已恢复默认值`);
    } catch (nextError) {
      if (activeWorkspaceIdRef.current === workspaceId) {
        setError(getErrorMessage(nextError, `${label}恢复默认失败`));
      }
    } finally {
      if (activeWorkspaceIdRef.current === workspaceId) {
        setIsResetting(false);
      }
    }
  };

  const chooseUploadDirectory = async (setting: "uploadImagePath" | "uploadAttachmentPath") => {
    if (!workspaceId || !settings || isEditingDisabled) return;
    try {
      const selected = await selectWorkspaceDirectory({
        workspaceId,
        purpose: "copy",
        initialPath: settings[setting],
      });
      if (selected)
        updateSettings((currentSettings) => ({
          ...currentSettings,
          [setting]: selected.directory,
        }));
    } catch (nextError) {
      setError(getErrorMessage(nextError, "无法选择目录"));
    }
  };

  const createResetContextMenu = (setting: ResettableWorkspaceSetting) => ({
    items: [
      {
        label: "恢复默认",
        onSelect: () => {
          void resetSingleSetting(setting);
        },
        value: `reset-${setting}`,
      },
    ],
  });

  const resetSettings = async () => {
    if (!workspaceId || isEditingDisabled) {
      return;
    }

    const targetWorkspaceId = workspaceId;
    const confirmed = await confirmNative({
      buttons: [
        { key: "cancel", style: "cancel", text: "取消" },
        { key: "reset", style: "destructive", text: "恢复默认" },
      ],
      message: "这会恢复此工作区的全部设置，并丢弃未保存的更改。是否继续？",
      title: "恢复默认设置",
    });

    if (confirmed !== "reset" || activeWorkspaceIdRef.current !== targetWorkspaceId) {
      return;
    }

    const requestId = ++saveRequestIdRef.current;
    setError(null);
    setIsResetting(true);

    try {
      const nextSettings = await workspace.resetSettings(targetWorkspaceId);

      if (
        requestId !== saveRequestIdRef.current ||
        activeWorkspaceIdRef.current !== targetWorkspaceId
      ) {
        return;
      }

      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    } catch (nextError) {
      if (
        requestId === saveRequestIdRef.current &&
        activeWorkspaceIdRef.current === targetWorkspaceId
      ) {
        setError(getErrorMessage(nextError, "工作区设置重置失败"));
      }
    } finally {
      if (
        requestId === saveRequestIdRef.current &&
        activeWorkspaceIdRef.current === targetWorkspaceId
      ) {
        setIsResetting(false);
      }
    }
  };

  return (
    <SettingsList
      dismissKeyboardOnTap
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      {presentation.desktop && workspaceId ? (
        <NativeListSection {...presentation.section}>
          <NativeListItem
            {...presentation.item}
            title={`当前工作区：${currentWorkspace?.id === workspaceId ? currentWorkspace.displayName : "加载中…"}`}
            subtitle="以下设置仅作用于此工作区。"
          />
        </NativeListSection>
      ) : null}

      {isLoading || error ? (
        <NativeListSection {...presentation.section} title="状态">
          <NativeListItem
            {...presentation.item}
            title={error ? "工作区设置加载或保存失败" : "正在加载工作区设置"}
            value={error ?? undefined}
          />
        </NativeListSection>
      ) : null}

      {settings ? (
        <>
          <NativeListSection {...presentation.section} title="文件浏览">
            <NativeListSwitchItem
              {...presentation.item}
              disabled={isEditingDisabled}
              switchProps={{
                ...presentation.switch,
                isSelected: settings.followGitignore,
                onSelectedChange: (nextValue) => {
                  updateSettings((currentSettings) => ({
                    ...currentSettings,
                    followGitignore: nextValue,
                  }));
                },
              }}
              title="遵循 .gitignore"
            />
          </NativeListSection>

          <NativeListSection
            {...presentation.section}
            footer="每行一条忽略规则。"
            title="自定义忽略规则"
          >
            <NativeListTextAreaItem
              {...presentation.item}
              contextMenuProps={createResetContextMenu("customIgnore")}
              disabled={isEditingDisabled}
              textAreaProps={{
                style: presentation.compact ? { fontSize: 13 } : undefined,
                onChangeText: (nextValue) => {
                  updateSettings((currentSettings) => ({
                    ...currentSettings,
                    customIgnore: nextValue,
                  }));
                },
                placeholder: "例如：\n*.tmp\n.cache/",
                value: settings.customIgnore,
              }}
            />
          </NativeListSection>

          <NativeListSection {...presentation.section} title="上传">
            <NativeListItem
              {...presentation.item}
              chevron
              contextMenuProps={createResetContextMenu("uploadImagePath")}
              disabled={isEditingDisabled}
              onPress={() => void chooseUploadDirectory("uploadImagePath")}
              title="图片目录"
              value={settings.uploadImagePath || "工作区根目录"}
            />
            <NativeListItem
              {...presentation.item}
              chevron
              contextMenuProps={createResetContextMenu("uploadAttachmentPath")}
              disabled={isEditingDisabled}
              onPress={() => void chooseUploadDirectory("uploadAttachmentPath")}
              title="附件目录"
              value={settings.uploadAttachmentPath || "工作区根目录"}
            />
          </NativeListSection>

          <NativeListSection
            {...presentation.section}
            footer="超过数量的历史快照会被清理；同一文件在间隔内的保存不会重复创建快照。"
            title="历史记录"
          >
            <NativeListSelectItem
              {...presentation.item}
              disabled={isEditingDisabled}
              selectProps={{
                ...presentation.select,
                "aria-label": "保留历史快照",
                onValueChange: (nextValue) => {
                  if (nextValue == null) {
                    return;
                  }

                  const nextCount = Number(nextValue);

                  if (!Number.isSafeInteger(nextCount) || nextCount < 0) {
                    return;
                  }

                  updateSettings((currentSettings) => ({
                    ...currentSettings,
                    historySnapshotCount: nextCount,
                  }));
                },
                options: HISTORY_SNAPSHOT_COUNT_OPTIONS,
                value: String(settings.historySnapshotCount),
              }}
              title="保留历史快照"
            />
            <NativeListSelectItem
              {...presentation.item}
              disabled={isEditingDisabled}
              selectProps={{
                ...presentation.select,
                "aria-label": "历史快照间隔",
                onValueChange: (nextValue) => {
                  if (nextValue == null) {
                    return;
                  }

                  const nextInterval = Number(nextValue);

                  if (!Number.isSafeInteger(nextInterval) || nextInterval < 0) {
                    return;
                  }

                  updateSettings((currentSettings) => ({
                    ...currentSettings,
                    historySnapshotIntervalMinutes: nextInterval,
                  }));
                },
                options: HISTORY_SNAPSHOT_INTERVAL_OPTIONS,
                value: String(settings.historySnapshotIntervalMinutes),
              }}
              title="历史快照间隔"
            />
          </NativeListSection>

          <NativeListSection {...presentation.section}>
            <NativeListButtonItem
              {...presentation.item}
              disabled={isEditingDisabled}
              onPress={saveSettings}
              title={isSaving ? "正在保存…" : "保存更改"}
            />
            <NativeListButtonItem
              {...presentation.item}
              btnTint={destructiveColor}
              disabled={isEditingDisabled}
              onPress={() => {
                void resetSettings();
              }}
              title={isResetting ? "正在恢复默认设置…" : "恢复默认设置"}
            />
          </NativeListSection>
        </>
      ) : null}
    </SettingsList>
  );
}
