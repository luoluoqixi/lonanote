import { StyleSheet } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListSection,
  Text,
} from "rn-ui-kit";

import { isIos } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { getStorageProviderLabel } from "@/components/common/storage_provider_utils";
import { useLayoutMode } from "@/hooks/layout";
import type { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";

import { WorkspaceStorageFields } from "./workspace_storage_fields";

export function WorkspaceLocationSheet({
  location,
}: {
  location: ReturnType<typeof useWorkspaceLocation>;
}) {
  const { layoutMode } = useLayoutMode();
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const { item, mode, target, isWorking, error } = location;
  const title = mode === "rebind" ? "重新定位工作区" : "更改存储位置";
  const canSubmit =
    target.providerId !== null &&
    !target.isLoading &&
    !target.isChoosing &&
    !isWorking &&
    (target.isManaged ? target.directoryName.trim().length > 0 : target.externalBinding !== null);
  return (
    <AdaptiveModal
      name="workspace-location-sheet"
      screenName="workspace-location"
      title={title}
      open={item !== null}
      onOpenChange={location.onOpenChange}
      dialogSize={{ width: 620, height: 560 }}
      sheetProps={{ snapPoints: ["88%"] }}
    >
      <NativeList
        style={styles.list}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosScrollEdgeHeader ? true : undefined}
        contentInsetAdjustmentBehavior={usesNativeIosScrollEdgeHeader ? "automatic" : undefined}
        dismissKeyboardOnTap
        tracksNavigationBarScrollEdge
      >
        <NativeListSection title={item?.displayName}>
          <NativeListCustomItem>
            <Text className="text-muted-foreground">
              当前存储位置：{getStorageProviderLabel(item?.storage.providerId)}
              {item?.storage.directoryName ? ` / ${item.storage.directoryName}` : ""}
            </Text>
          </NativeListCustomItem>
          <NativeListCustomItem>
            <Text selectable className="text-muted-foreground">
              {location.currentPath}
            </Text>
          </NativeListCustomItem>
          <NativeListCustomItem>
            <Text className="text-muted-foreground">
              {mode === "rebind"
                ? "选择已移动到的新位置。目标文件夹必须包含此工作区，文件不会被移动或删除。"
                : "将工作区文件迁移到新位置，成功后删除旧文件夹。目标文件夹不可重名或包含其他文件。"}
            </Text>
          </NativeListCustomItem>
        </NativeListSection>
        <NativeListSection title="目标位置">
          <WorkspaceStorageFields target={target} disabled={isWorking} showDirectoryName />
        </NativeListSection>
        {error ? (
          <NativeListSection>
            <NativeListCustomItem>
              <Text className="text-destructive">{error}</Text>
            </NativeListCustomItem>
          </NativeListSection>
        ) : null}
        <NativeListSection>
          <NativeListButtonItem
            disabled={!canSubmit}
            title={isWorking ? "正在处理…" : mode === "rebind" ? "重新定位" : "迁移"}
            onPress={() => {
              void location.submit();
            }}
          />
        </NativeListSection>
      </NativeList>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({ list: { flex: 1, minHeight: 0 } });
