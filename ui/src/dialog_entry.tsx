// sort-imports-ignore
import "./initialize";

import type { ComponentType } from "react";
import type { DialogId } from "@/api/common/dialogs/dialog_types";
import type { DialogRendererProps } from "@/api/common/dialogs/dialog_content_registry";
import { registerRootComponent } from "expo";
import { dialogWindows } from "@/api/commands/win/dialog_windows";
import { initializeConfigSyncController } from "@/api/common/config_sync_controller";
import { DialogWindowHost } from "@/api/common/dialogs/dialog_window_host";
import { initializeRustRuntime } from "@/api/invoke";
import { initConfig } from "@/config";
import { AppUiProvider } from "@/providers/app_provider/app_ui_provider.web";
import { applyThemeBootstrap } from "@/stores/ui";

declare global {
  interface Window {
    readonly __LONANOTE_DIALOG_REQUEST_ID__?: string;
  }
}

export function registerDialogWindow(
  dialogId: DialogId,
  Renderer: ComponentType<DialogRendererProps<any>>,
) {
  performance.mark("dialog:entry-evaluated");
  const requestId = window.__LONANOTE_DIALOG_REQUEST_ID__;

  async function bootstrap() {
    if (!requestId) throw new Error("Dialog 启动缺少请求标识");
    applyThemeBootstrap();
    initializeRustRuntime();
    // 先订阅再读取快照；独立窗口不能借用主窗口内存中的配置。
    const dispose = await initializeConfigSyncController();
    window.addEventListener("pagehide", dispose, { once: true });
    await initConfig();
    registerRootComponent(() => (
      <AppUiProvider>
        <DialogWindowHost
          requestId={requestId}
          expectedDialogId={dialogId}
          resolveRenderer={() => Renderer}
        />
      </AppUiProvider>
    ));
  }

  void bootstrap().catch(async (error) => {
    console.error("[dialog] 独立入口初始化失败", error);
    try {
      if (requestId) await dialogWindows.complete(requestId, { __dialogRendererFailure: true });
      else await dialogWindows.closeCurrent();
    } catch {
      await dialogWindows.closeCurrent().catch(console.error);
    }
  });
}
