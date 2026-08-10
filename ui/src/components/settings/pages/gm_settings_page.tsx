import { useState } from "react";
import {
  NativeList,
  NativeListButtonItem,
  NativeListSection,
  confirmNative,
  toSwiftUIHexColor,
  triggerNativeHaptics,
  useTheme,
} from "rn-ui-kit";

import { system } from "@/api";
import { gm } from "@/api/commands/gm";
import { isSystemLocaleCN, isWeb, systemLocale } from "@/api/common/platform";
import { useToast } from "@/hooks/ui";

import type { SettingsPageProps } from "../settings_config";

export function GmSettingsPage({ tracksNavigationBarScrollEdge = false }: SettingsPageProps = {}) {
  const { toast } = useToast();
  const theme = useTheme();
  const [isResettingInitialWorkspace, setIsResettingInitialWorkspace] = useState(false);
  const [isGettingSystemLocale, setIsGettingSystemLocale] = useState(false);

  const redColor = toSwiftUIHexColor(theme.red11.val) ?? theme.color11.val;

  // 桌面端 GM Sheet 使用 JS Stack；需要由页面级列表驱动 Header 的 scroll-edge 背景。
  const tracksScrollEdgeHeader = isWeb() || tracksNavigationBarScrollEdge;

  const resetInitialWorkspace = async () => {
    if (isResettingInitialWorkspace) {
      return;
    }
    triggerNativeHaptics(true);

    const next = await confirmNative({
      buttons: [
        { key: "cancel", style: "cancel", text: "取消" },
        { key: "confirm", style: "destructive", text: "重置" },
      ],
      message: "此操作会删除默认工作区, 无法恢复, 是否确定？",
      title: "警告",
    });

    if (next !== "confirm") return;

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

  const getSystemLocaleSync = () => {
    try {
      const locale = systemLocale();
      toast.success(`当前系统语言：${locale}`);
    } catch (error) {
      console.error("[gm] get system locale sync failed", error);
      toast.error(error instanceof Error ? error.message : "获取当前系统语言失败");
    }
  };

  const isSystemLocaleCNPress = () => {
    try {
      const isCN = isSystemLocaleCN();
      toast.success(`是否是CN: ${isCN}`);
    } catch (error) {
      console.error("[gm] is system locale failed", error);
      toast.error(error instanceof Error ? error.message : "获取当前系统语言失败");
    }
  };

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksScrollEdgeHeader ? true : undefined}
      contentInsetAdjustmentBehavior={tracksScrollEdgeHeader ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksScrollEdgeHeader}
    >
      <NativeListSection title="Runtime">
        <NativeListButtonItem
          disabled={isGettingSystemLocale}
          onPress={getSystemLocale}
          title={isGettingSystemLocale ? "正在获取系统语言…" : "获取当前系统语言"}
        />
        <NativeListButtonItem onPress={getSystemLocaleSync} title={"同步获取当前系统语言"} />
        <NativeListButtonItem onPress={isSystemLocaleCNPress} title={"系统语言是否是CN"} />
      </NativeListSection>

      <NativeListSection title="Workspace">
        <NativeListButtonItem
          disabled={isResettingInitialWorkspace}
          onPress={resetInitialWorkspace}
          btnTint={redColor}
          title={isResettingInitialWorkspace ? "正在重置默认工作区…" : "重置首次默认工作区"}
        />
      </NativeListSection>
    </NativeList>
  );
}
