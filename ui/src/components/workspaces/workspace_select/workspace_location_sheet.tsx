import { FolderOpen, Info } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListItem,
  NativeListSection,
  Text,
  Tooltip,
  useUiTheme,
} from "rn-ui-kit";

import { isDesktop, isIos } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { getStorageProviderLabel } from "@/components/common/storage_provider_utils";
import { useLayoutMode } from "@/hooks/layout";
import type { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";

import { renderWorkspaceStorageFields } from "./workspace_storage_fields";

export function WorkspaceLocationSheet({
  location,
}: {
  location: ReturnType<typeof useWorkspaceLocation>;
}) {
  const { layoutMode } = useLayoutMode();
  const theme = useUiTheme();
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const { item, mode, target, isWorking, error } = location;
  const title = mode === "rebind" ? "重新定位工作区" : "更改存储位置";
  const hint =
    mode === "rebind"
      ? "选择已移动到的新位置。目标文件夹必须包含此工作区，文件不会被移动或删除。"
      : "将工作区文件迁移到新位置，成功后删除旧文件夹。目标文件夹不可重名或包含其他文件。";
  const canSubmit =
    target.providerId !== null &&
    !target.isLoading &&
    !target.isChoosing &&
    !isWorking &&
    !location.isSameLocation &&
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
        native={false}
        style={styles.list}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosScrollEdgeHeader ? true : undefined}
        contentInsetAdjustmentBehavior={usesNativeIosScrollEdgeHeader ? "automatic" : undefined}
        dismissKeyboardOnTap
        tracksNavigationBarScrollEdge
      >
        <View className="gap-1 px-5 pb-2 pt-3">
          <View className="flex-row items-center gap-1">
            <Text className="shrink text-base font-semibold">{item?.displayName}</Text>
            <Tooltip
              content={hint}
              openOnFocus={false}
              openOnPress
              contentProps={{ side: "bottom", align: "start", style: { maxWidth: 280 } }}
            >
              <Button
                aria-label={mode === "rebind" ? "重新定位说明" : "迁移说明"}
                variant="ghost"
                size="sm"
                buttonSize={{ width: 28, height: 28 }}
                hitSlop={8}
              >
                <Info size={15} color={theme.mutedForeground} />
              </Button>
            </Tooltip>
          </View>
        </View>
        <NativeListSection>
          <NativeListItem
            title={`当前存储位置：${getStorageProviderLabel(item?.storage.providerId)}`}
            titleFontSize={14}
            subtitle={
              <Text selectable className="text-xs leading-5 text-muted-foreground">
                {location.currentPath}
              </Text>
            }
            value={
              isDesktop() ? (
                <Tooltip content="在文件管理器中显示" openOnFocus={false}>
                  <Button
                    aria-label="在文件管理器中显示"
                    variant="ghost"
                    size="sm"
                    buttonSize={{ width: 32, height: 32 }}
                    disabled={!location.canRevealCurrentFolder}
                    onPress={() => {
                      void location.revealCurrentFolder();
                    }}
                  >
                    <FolderOpen size={18} color={theme.mutedForeground} />
                  </Button>
                </Tooltip>
              ) : undefined
            }
          />
        </NativeListSection>
        <NativeListSection title="目标位置">
          {renderWorkspaceStorageFields({ target, disabled: isWorking, showDirectoryName: true })}
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
