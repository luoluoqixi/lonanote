import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';

class WorkspaceManagerController {
  static Future<void> refreshWorkspace(
    WidgetRef ref,
    bool updateWorkspaces,
    bool updateCurrentWorkspace,
  ) async {
    final ws = ref.read(workspaceProvider.notifier);
    if (updateWorkspaces) {
      await ws.updateWorkspaces();
    }
    if (updateCurrentWorkspace) {
      await ws.updateCurrentWorkspace();
    }
  }

  static RustWorkspaceData? getCurrentWorkspace(WidgetRef ref) {
    final ws = ref.read(workspaceProvider);
    return ws.currentWorkspace;
  }

  static Future<String> createWorkspace(
    WidgetRef ref,
    String workspaceName, {
    bool updateWorkspaces = false, // 默认不需要更新工作区列表, 因为要跳转工作区页面
    bool updateCurrentWorkspace = true,
  }) async {
    final path = await RustWorkspaceManager.createWorkspace(workspaceName);
    logger.i("create workspace: $workspaceName");
    await refreshWorkspace(
      ref,
      updateWorkspaces,
      updateCurrentWorkspace,
    );
    return path;
  }

  static Future<void> deleteWorkspace(
    WidgetRef ref,
    String workspaceName,
    bool deleteFile, {
    bool refresh = true,
    int? delayRefresh,
    bool updateWorkspaces = true,
    bool updateCurrentWorkspace = true,
  }) async {
    await RustWorkspaceManager.removeWorkspace(workspaceName, deleteFile);
    logger.i("delete workspace: $workspaceName");
    await refreshWorkspace(
      ref,
      updateWorkspaces,
      updateCurrentWorkspace,
    );
  }

  static Future<void> renameWorkspace(
    WidgetRef ref,
    String workspacePath,
    String workspaceName, {
    bool refresh = true,
    int? delayRefresh,
    bool updateWorkspaces = true,
    bool updateCurrentWorkspace = true,
  }) async {
    await RustWorkspaceManager.setWorkspaceName(
        workspacePath, workspaceName, true);
    logger.i("rename workspace to: $workspaceName");
    await refreshWorkspace(
      ref,
      updateWorkspaces,
      updateCurrentWorkspace,
    );
  }

  static Future<void> unloadWorkspace(
    WidgetRef ref, {
    bool refresh = true,
    int? delayRefresh,
    bool updateWorkspaces = true,
    bool updateCurrentWorkspace = true,
  }) async {
    final currentWorkspace = RustWorkspaceManager.getCurrentOpenWorkspace();
    if (currentWorkspace != null) {
      await RustWorkspaceManager.unloadWorkspaceByPath(currentWorkspace);
      logger.i("unload workspace: $currentWorkspace");
      await refreshWorkspace(
        ref,
        updateWorkspaces,
        updateCurrentWorkspace,
      );
    }
  }

  static Future<void> openWorkspace(
    WidgetRef ref,
    String workspacePath, {
    bool refresh = false,
    int? delayRefresh,
    bool updateWorkspaces = false, // 默认不需要更新工作区列表, 因为要跳转工作区页面
    bool updateCurrentWorkspace = true,
  }) async {
    final currentWorkspace = RustWorkspaceManager.getCurrentOpenWorkspace();
    if (currentWorkspace != null) {
      if (workspacePath != currentWorkspace) {
        await RustWorkspaceManager.unloadWorkspaceByPath(currentWorkspace);
        logger.i("unload workspace: $currentWorkspace");
        await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
        await refreshWorkspace(
          ref,
          updateWorkspaces,
          updateCurrentWorkspace,
        );
        logger.i("open workspace: $workspacePath");
      } else {
        logger.i("workspace has been opened: $workspacePath");
      }
    } else {
      await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
      await refreshWorkspace(
        ref,
        updateWorkspaces,
        updateCurrentWorkspace,
      );
      logger.i("open workspace: $workspacePath");
    }
  }
}
