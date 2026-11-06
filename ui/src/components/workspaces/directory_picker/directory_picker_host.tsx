import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Input, Spinner, Text, useUiTheme } from "rn-ui-kit";

import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { useLayoutMode } from "@/hooks/layout";
import {
  workspaceDirectoryPicker as picker,
  useWorkspaceDirectoryPicker,
} from "@/hooks/workspace/use_workspace_directory_picker";

import type { DirectoryPickerState } from "./directory_picker_model";

function DirectoryRow({
  path,
  depth,
  state,
  desktop,
}: {
  path: string;
  depth: number;
  state: DirectoryPickerState;
  desktop: boolean;
}) {
  const theme = useUiTheme();
  const [hovered, setHovered] = useState(false);
  const expanded = state.expanded.has(path);
  const selected = state.selected === path;
  const excluded = (state.options.excludedPaths ?? []).some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const FolderIcon = expanded ? FolderOpen : Folder;
  const fontSize = desktop ? 13 : 15;
  return (
    <View>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={path ? path.split("/").at(-1) : "工作区根目录"}
          accessibilityState={{ selected, expanded, disabled: excluded }}
          disabled={excluded}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPress={() => {
            void picker.activate(path);
          }}
          style={[
            styles.row,
            {
              height: desktop ? 30 : 44,
              paddingLeft: 8 + depth * 16,
              opacity: excluded ? 0.45 : 1,
              backgroundColor: selected || hovered ? theme.accent03 : "transparent",
              borderColor: selected ? theme.primary : "transparent",
            },
          ]}
        >
          <Chevron size={14} color={theme.mutedForeground} />
          <FolderIcon size={16} color={theme.mutedForeground} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize, color: theme.foreground }}>
            {path ? path.split("/").at(-1) : "工作区根目录"}
          </Text>
          {state.loading[path] ? <Spinner size="sm" /> : null}
        </Pressable>
      </View>
      {expanded ? (
        <View>
          {state.errors[path] ? (
            <Pressable
              onPress={() => {
                void picker.load(path);
              }}
              style={{ paddingLeft: 28 + depth * 16, paddingVertical: 6 }}
            >
              <Text className="text-destructive" style={{ fontSize }}>
                读取失败，点击重试
              </Text>
            </Pressable>
          ) : null}
          {state.directories[path]?.map((entry) => (
            <DirectoryRow
              key={entry.path}
              path={entry.path}
              depth={depth + 1}
              state={state}
              desktop={desktop}
            />
          ))}
          {path === "" && state.directories[path]?.length === 0 ? (
            <Text
              className="text-muted-foreground"
              style={{ fontSize, paddingHorizontal: 28, paddingVertical: 8 }}
            >
              没有可选的子文件夹
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function DirectoryPickerHost() {
  const state = useWorkspaceDirectoryPicker();
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const theme = useUiTheme();
  const token = state?.token;
  useEffect(() => {
    if (token !== undefined) void picker.load("");
  }, [token]);
  useEffect(() => () => picker.cancel(), []);
  if (!state) return null;
  return (
    <AdaptiveModal
      name="workspace-directory-picker"
      title={state.options.purpose === "save" ? "保存笔记" : "选择目标文件夹"}
      open
      onOpenChange={(open) => {
        if (!open) picker.cancel();
      }}
      dialogSize={{ width: 560, height: 460 }}
    >
      <View style={{ flex: 1, gap: 12, minHeight: 0 }}>
        {state.options.purpose !== "save" && (state.options.sourceCount ?? 0) > 1 ? (
          <Text style={{ fontSize: desktop ? 12 : 14, color: theme.mutedForeground }}>
            将{state.options.purpose === "move" ? "移动" : "复制"} {state.options.sourceCount}{" "}
            个项目
          </Text>
        ) : null}
        <FilePathTooltip path={`/${state.selected}`} disabled={!desktop}>
          <View>
            <Text
              numberOfLines={1}
              style={{ fontSize: desktop ? 12 : 14, color: theme.mutedForeground }}
            >
              /{state.selected}
            </Text>
          </View>
        </FilePathTooltip>
        <ScrollView
          style={{
            flex: 1,
            minHeight: 0,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border,
            borderRadius: 6,
          }}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          <DirectoryRow path="" depth={0} state={state} desktop={desktop} />
        </ScrollView>
        {state.options.purpose === "save" ? (
          <Input value={state.fileName} onChangeText={picker.setFileName} placeholder="文件名.md" />
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="outline" onPress={picker.cancel}>
            <Text>取消</Text>
          </Button>
          <Button disabled={!picker.canConfirm()} onPress={picker.confirm}>
            <Text>确定</Text>
          </Button>
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
    borderWidth: 1,
    minWidth: 0,
  },
});
