import { useState } from "react";
import { NativeList, NativeListButtonItem, NativeListSection } from "rn-ui-kit";

import { system } from "@/api";
import { gm } from "@/api/commands/gm";
import { useToast } from "@/hooks/ui";

import type { SettingsPageProps } from "../settings_config";

export function GmSettingsPage({ tracksNavigationBarScrollEdge = false }: SettingsPageProps = {}) {
  const { toast } = useToast();
  const [isResettingInitialWorkspace, setIsResettingInitialWorkspace] = useState(false);
  const [isGettingSystemLocale, setIsGettingSystemLocale] = useState(false);

  const resetInitialWorkspace = () => {
    if (isResettingInitialWorkspace) {
      return;
    }

    setIsResettingInitialWorkspace(true);
    void gm.workspace
      .resetInitialWorkspace()
      .then((removedWorkspace) => {
        if (removedWorkspace) {
          toast.success("已删除默认工作区并重置首次启动状态");
        } else {
          toast.success("已重置首次启动状态");
        }
      })
      .catch((error) => {
        console.error("[gm] reset initial workspace failed", error);
        toast.error(error instanceof Error ? error.message : "重置默认工作区失败");
      })
      .finally(() => {
        setIsResettingInitialWorkspace(false);
      });
  };

  const getSystemLocale = () => {
    if (isGettingSystemLocale) {
      return;
    }

    setIsGettingSystemLocale(true);
    void system
      .getSystemLocale()
      .then((locale) => {
        toast.success(`当前系统语言：${locale}`);
      })
      .catch((error) => {
        console.error("[gm] get system locale failed", error);
        toast.error(error instanceof Error ? error.message : "获取当前系统语言失败");
      })
      .finally(() => {
        setIsGettingSystemLocale(false);
      });
  };

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="Runtime">
        <NativeListButtonItem
          disabled={isGettingSystemLocale}
          onPress={getSystemLocale}
          title={isGettingSystemLocale ? "正在获取系统语言…" : "获取当前系统语言"}
        />
      </NativeListSection>

      <NativeListSection title="Workspace">
        <NativeListButtonItem
          disabled={isResettingInitialWorkspace}
          onPress={resetInitialWorkspace}
          title={isResettingInitialWorkspace ? "正在重置默认工作区…" : "重置首次默认工作区"}
        />
      </NativeListSection>
    </NativeList>
  );
}
