import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';

class WorkspaceManager {
  static Future<String> createWorkspace(
      WidgetRef ref, String workspaceName) async {
    final path = await RustWorkspaceManager.createWorkspace(workspaceName);
    logger.i("create workspace: $workspaceName");
    final ws = ref.read(workspaceProvider.notifier);
    await ws.updateAll();
    return path;
  }

  static Future<void> deleteWorkspace(
      WidgetRef ref, String workspaceName) async {
    await RustWorkspaceManager.removeWorkspace(workspaceName);
    logger.i("delete workspace: $workspaceName");
    final ws = ref.read(workspaceProvider.notifier);
    await ws.updateAll();
  }

  static Future<void> renameWorkspace(
      WidgetRef ref, String workspacePath, String workspaceName) async {
    await RustWorkspaceManager.setWorkspaceName(
        workspacePath, workspaceName, true);
    logger.i("rename workspace to: $workspaceName");
    final ws = ref.read(workspaceProvider.notifier);
    await ws.updateAll();
  }

  static RustWorkspaceData? getCurrentWorkspace(WidgetRef ref) {
    final ws = ref.read(workspaceProvider);
    return ws.currentWorkspace;
  }

  static Future<void> openWorkspace(WidgetRef ref, String workspacePath) async {
    final currentWorkspace = RustWorkspaceManager.getCurrentOpenWorkspace();
    if (currentWorkspace != null) {
      if (workspacePath != currentWorkspace) {
        await RustWorkspaceManager.unloadWorkspaceByPath(currentWorkspace);
        logger.i("unload workspace: $currentWorkspace");
        await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
        final ws = ref.read(workspaceProvider.notifier);
        await ws.updateAll();
        logger.i("open workspace: $workspacePath");
      } else {
        logger.i("workspace has been opened: $workspacePath");
      }
    } else {
      await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
      final ws = ref.read(workspaceProvider.notifier);
      await ws.updateAll();
      logger.i("open workspace: $workspacePath");
    }
  }
}
