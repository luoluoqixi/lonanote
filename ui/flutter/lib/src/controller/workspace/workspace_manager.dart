import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';

class WorkspaceManager {
  static Future<String> createWorkspace(
      WidgetRef ref, String workspaceName) async {
    final path = await RustWorkspaceManager.createWorkspace(workspaceName);
    logger.i("create workspace: $workspaceName");
    final ws = ref.read(workspaceProvider.notifier);
    ws.updateAll();
    return path;
  }

  static Future<void> openWorkspace(WidgetRef ref, String workspacePath) async {
    final currentWorkspace = RustWorkspaceManager.getCurrentOpenWorkspace();
    if (currentWorkspace != null) {
      if (workspacePath != currentWorkspace) {
        await RustWorkspaceManager.unloadWorkspaceByPath(currentWorkspace);
        logger.i("unload workspace: $currentWorkspace");
        await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
        logger.i("open workspace: $workspacePath");
      } else {
        logger.i("workspace has been opened: $workspacePath");
      }
    } else {
      await RustWorkspaceManager.openWorkspaceByPath(workspacePath);
      logger.i("open workspace: $workspacePath");
    }
  }
}
