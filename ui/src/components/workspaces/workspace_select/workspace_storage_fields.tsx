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

export function WorkspaceStorageFields({
  target,
  disabled,
  showDirectoryName = false,
}: {
  target: WorkspaceStorageTargetForm;
  disabled: boolean;
  showDirectoryName?: boolean;
}) {
  return (
    <>
      {target.isLoading ? (
        <NativeListCustomItem>
          <Text className="text-muted-foreground">正在加载存储位置…</Text>
        </NativeListCustomItem>
      ) : target.providerIds.length === 0 ? (
        <NativeListCustomItem>
          <Text className="text-destructive">{target.error ?? "当前设备没有可用的存储位置"}</Text>
        </NativeListCustomItem>
      ) : (
        <>
          <NativeListSelectItem
            title="存储位置"
            selectProps={{
              disabled: disabled || target.isChoosing,
              onValueChange: target.changeProvider,
              options: target.providerIds.map((id) => ({
                label: getStorageProviderLabel(id),
                value: id,
              })),
              value: target.providerId ?? undefined,
            }}
          />
          {target.isManaged ? (
            showDirectoryName ? (
              <NativeListInputItem
                title="文件夹名"
                inputProps={{
                  editable: !disabled,
                  value: target.directoryName,
                  onChangeText: target.setDirectoryName,
                  placeholder: "输入文件夹名称",
                  textAlign: "right",
                }}
              />
            ) : null
          ) : (
            <>
              <NativeListButtonItem
                disabled={disabled || target.isChoosing}
                title={target.isChoosing ? "正在选择…" : "选择文件夹…"}
                onPress={() => {
                  void target.chooseFolder();
                }}
              />
              {target.externalBinding ? (
                <NativeListCustomItem>
                  <Text selectable className="text-muted-foreground">
                    {target.externalBinding.resourceRef}
                  </Text>
                </NativeListCustomItem>
              ) : null}
            </>
          )}
          {target.error ? (
            <NativeListCustomItem>
              <Text className="text-destructive">{target.error}</Text>
            </NativeListCustomItem>
          ) : null}
        </>
      )}
    </>
  );
}
