import {
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListInputItem,
  NativeListSelectItem,
  Text,
} from "rn-ui-kit";

import { getStorageProviderLabel } from "@/components/common/storage_provider_utils";
import type { useWorkspaceStorageTarget } from "@/hooks/workspace/use_workspace_storage_target";

export type WorkspaceStorageTargetForm = ReturnType<typeof useWorkspaceStorageTarget>;

export function renderWorkspaceStorageFields({
  target,
  disabled,
  showDirectoryName = false,
  desktop = false,
}: {
  target: WorkspaceStorageTargetForm;
  disabled: boolean;
  showDirectoryName?: boolean;
  desktop?: boolean;
}) {
  // 将各行直接交给 Section，避免所有行继承同一个分割线位置。
  if (target.isLoading)
    return [
      <NativeListCustomItem key="loading">
        <Text style={desktop ? { fontSize: 13 } : undefined} className="text-muted-foreground">
          正在加载存储位置…
        </Text>
      </NativeListCustomItem>,
    ];
  if (target.providerIds.length === 0)
    return [
      <NativeListCustomItem key="empty">
        <Text style={desktop ? { fontSize: 13 } : undefined} className="text-destructive">
          {target.error ?? "当前设备没有可用的存储位置"}
        </Text>
      </NativeListCustomItem>,
    ];
  return [
    <NativeListSelectItem
      titleFontSize={desktop ? 13 : undefined}
      valueFontSize={desktop ? 13 : undefined}
      key="provider"
      title="存储位置"
      selectProps={{
        contentSize: desktop ? "xs" : undefined,
        nativeTriggerLabelProps: desktop ? { style: { fontSize: 13 } } : undefined,
        nativeTriggerProps: desktop ? { size: "sm" } : undefined,
        disabled: disabled || target.isChoosing,
        onValueChange: target.changeProvider,
        options: target.providerIds.map((id) => ({
          label: getStorageProviderLabel(id),
          value: id,
        })),
        value: target.providerId ?? undefined,
      }}
    />,
    target.isManaged && showDirectoryName ? (
      <NativeListInputItem
        titleFontSize={desktop ? 13 : undefined}
        valueFontSize={desktop ? 13 : undefined}
        key="directory"
        title="文件夹名"
        inputProps={{
          style: desktop ? { fontSize: 13 } : undefined,
          editable: !disabled,
          value: target.directoryName,
          onChangeText: target.setDirectoryName,
          placeholder: "输入文件夹名称",
          textAlign: "right",
        }}
      />
    ) : null,
    !target.isManaged ? (
      <NativeListButtonItem
        titleFontSize={desktop ? 13 : undefined}
        valueFontSize={desktop ? 13 : undefined}
        key="choose"
        disabled={disabled || target.isChoosing}
        title={target.isChoosing ? "正在选择…" : "选择文件夹…"}
        onPress={() => {
          void target.chooseFolder();
        }}
      />
    ) : null,
    !target.isManaged && target.externalBinding ? (
      <NativeListCustomItem key="path">
        <Text
          style={desktop ? { fontSize: 13 } : undefined}
          selectable
          className="text-muted-foreground"
        >
          {target.externalBinding.resourceRef}
        </Text>
      </NativeListCustomItem>
    ) : null,
    target.error ? (
      <NativeListCustomItem key="error">
        <Text style={desktop ? { fontSize: 13 } : undefined} className="text-destructive">
          {target.error}
        </Text>
      </NativeListCustomItem>
    ) : null,
  ];
}
