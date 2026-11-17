import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, NativeList, NativeListSection, Text } from "rn-ui-kit";

import { workspace } from "@/api/commands/workspace";
import type { DialogRendererProps } from "@/api/common/dialogs/dialog_content_registry";
import { isCurrentWorkspaceLocation } from "@/components/workspaces/workspace_select/workspace_location_target";
import { renderWorkspaceStorageFields } from "@/components/workspaces/workspace_select/workspace_storage_fields";
import { useWorkspaceStorageTarget } from "@/hooks/workspace/use_workspace_storage_target";

export function WorkspaceLocationDialogRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.location">) {
  const target = useWorkspaceStorageTarget();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const { workspaceItem, mode } = payload;
  useEffect(() => {
    void target.load(workspaceItem.storage.providerId, workspaceItem.storage.directoryName ?? "");
    void workspace
      .nativeRootPath(workspaceItem.id)
      .then(setCurrentPath, () => setCurrentPath(null));
  }, [target.load, workspaceItem]);

  const isSameLocation = isCurrentWorkspaceLocation(workspaceItem.storage, currentPath, target);
  const canSubmit =
    !target.isLoading &&
    !target.isChoosing &&
    !isSameLocation &&
    target.providerId !== null &&
    (target.isManaged ? target.directoryName.trim().length > 0 : target.externalBinding !== null);

  return (
    <View style={{ flex: 1, minHeight: 0, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "600" }}>{workspaceItem.displayName}</Text>
      <NativeList native={false} style={{ flex: 1, minHeight: 0 }}>
        <NativeListSection title="目标位置">
          {renderWorkspaceStorageFields({
            target,
            disabled: false,
            showDirectoryName: true,
            desktop: true,
          })}
        </NativeListSection>
        {target.error ? (
          <NativeListSection>
            <Text className="text-destructive">{target.error}</Text>
          </NativeListSection>
        ) : null}
      </NativeList>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="outline" onPress={() => onComplete(undefined)}>
          <Text>取消</Text>
        </Button>
        <Button
          disabled={!canSubmit}
          onPress={() => {
            if (!target.providerId) return;
            if (target.isManaged) {
              onComplete({
                kind: "managed",
                providerId: target.providerId,
                providerSchemaVersion: 1,
                directoryName: target.directoryName.trim(),
              });
            } else if (target.externalBinding) {
              onComplete(target.externalBinding);
            }
          }}
        >
          <Text>{mode === "rebind" ? "重新定位" : "迁移"}</Text>
        </Button>
      </View>
    </View>
  );
}
