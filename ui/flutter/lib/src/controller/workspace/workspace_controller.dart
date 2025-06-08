import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/fs/fs.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';

class WorkspaceController {
  static Future<void> setWorkspaceSettings(
    WidgetRef ref,
    RustWorkspaceSettings settings,
  ) async {
    await RustWorkspace.setCurrentWorkspaceSettings(settings);
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<RustFileTree> getWorkspaceFileTree(WidgetRef ref) async {
    return await RustWorkspace.getCurrentWorkspaceFileTree();
  }

  static Future<void> setWorkspaceFileTreeSortType(
    WidgetRef ref,
    String sortType,
  ) async {
    await RustWorkspace.setCurrentWorkspaceFileTreeSortType(sortType);
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> setWorkspaceFollowGitignore(
    WidgetRef ref,
    bool followGitignore,
  ) async {
    await RustWorkspace.setCurrentWorkspaceFollowGitignore(followGitignore);
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> setWorkspaceCustomIgnore(
    WidgetRef ref,
    String customIgnore,
  ) async {
    await RustWorkspace.setCurrentWorkspaceCustomIgnore(customIgnore);
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> resetWorkspaceCustomIgnore(
    WidgetRef ref,
  ) async {
    await RustWorkspace.resetCurrentWorkspaceCustomIgnore();
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> resetWorkspaceHistroySnapshootCount(
    WidgetRef ref,
  ) async {
    await RustWorkspace.resetCurrentWorkspaceHistroySnapshootCount();
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> resetWorkspaceUploadAttachmentPath(
    WidgetRef ref,
  ) async {
    await RustWorkspace.resetCurrentWorkspaceUploadAttachmentPath();
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<void> resetWorkspaceUploadImagePath(
    WidgetRef ref,
  ) async {
    await RustWorkspace.resetCurrentWorkspaceUploadImagePath();
    WorkspaceManagerController.refreshWorkspace(ref, false, true);
  }

  static Future<RustFileNode> getWorkspaceFileNode(
    WidgetRef ref,
    String? nodePath,
    RustFileSortType sortType,
  ) async {
    return await RustWorkspace.getCurrentWorkspaceFileNode(
      nodePath,
      sortType.name,
      false,
    );
  }

  static Future<void> setWorkspaceUploadImagePath(
    WidgetRef ref,
    String value,
  ) async {
    final ws = ref.read(workspaceProvider.select((w) => w.currentWorkspace));
    if (ws != null) {
      final s = ws.settings;
      s.uploadImagePath = value;
      await setWorkspaceSettings(ref, s);
    }
  }

  static Future<void> setWorkspaceUploadAttachmentPath(
    WidgetRef ref,
    String value,
  ) async {
    final ws = ref.read(workspaceProvider.select((w) => w.currentWorkspace));
    if (ws != null) {
      final s = ws.settings;
      s.uploadAttachmentPath = value;
      setWorkspaceSettings(ref, s);
    }
  }

  static Future<void> setWorkspaceHistroySnapshootCount(
    WidgetRef ref,
    int value,
  ) async {
    final ws = ref.read(workspaceProvider.select((w) => w.currentWorkspace));
    if (ws != null) {
      final s = ws.settings;
      s.histroySnapshootCount = value;
      setWorkspaceSettings(ref, s);
    }
  }

  static String? getCurrentWorkspacePath(WidgetRef ref) {
    final ws = ref.read(workspaceProvider.select((w) => w.currentWorkspace));
    if (ws != null) {
      final dir = RustWorkspaceManager.getWorkspaceDir();
      return "$dir/${ws.metadata.name}";
    }
    return null;
  }

  static void createFolder(
    WidgetRef ref,
    String folderPath,
  ) {
    final wsPath = getCurrentWorkspacePath(ref);
    if (wsPath != null) {
      final targetPath = "$wsPath/$folderPath";
      if (!RustFs.exists(targetPath)) {
        RustFs.createDirAll(targetPath);
      } else {
        throw Exception("文件夹已存在: $targetPath");
      }
    }
  }

  static void createFile(
    WidgetRef ref,
    String filePath,
  ) {
    final wsPath = getCurrentWorkspacePath(ref);
    if (wsPath != null) {
      final targetPath = "$wsPath/$filePath";
      if (!RustFs.exists(targetPath)) {
        RustFs.createFile(targetPath, "");
      } else {
        throw Exception("文件已存在: $targetPath");
      }
    }
  }

  static void deleteFileOrFolder(
    WidgetRef ref,
    String path,
  ) {
    final wsPath = getCurrentWorkspacePath(ref);
    if (wsPath != null) {
      final targetPath = "$wsPath/$path";
      if (RustFs.exists(targetPath)) {
        RustFs.delete(targetPath, false);
      }
    }
  }

  static void renameFileOrFolder(
    WidgetRef ref,
    String path,
    String targetPath,
  ) {
    final wsPath = getCurrentWorkspacePath(ref);
    if (wsPath != null) {
      final src = "$wsPath/$path";
      final target = "$wsPath/$targetPath";
      if (!RustFs.exists(target)) {
        RustFs.move(src, target, true);
      } else {
        throw Exception("路径已存在: $target");
      }
    }
  }
}
