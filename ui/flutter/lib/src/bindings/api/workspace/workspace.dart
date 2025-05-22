import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/common/config/app_config.dart';

import '../../bindings.dart';

String checkCurrentOpenWorkspace() {
  final path = RustWorkspaceManager.getCurrentOpenWorkspace();
  if (path == null) throw Exception('workspace is not open');
  return path;
}

class RustWorkspace {
  static Future<bool> isOpenWorkspace(String? path) async {
    if (path == null) {
      return false;
    }
    return await Bindings.invokeAsync(
        key: "workspace.is_open_workspace", value: {"path": path});
  }

  static Future<RustWorkspaceData?> getWorkspace(String? path) async {
    if (path == null) {
      return null;
    }
    final ws = await Bindings.invokeAsync(
        key: "workspace.get_open_workspace", value: {"path": path});
    return RustWorkspaceData.fromJson(ws);
  }

  static Future<RustWorkspaceSettings> getWorkspaceSettings(String path) async {
    final s = await Bindings.invokeAsync(
        key: "workspace.get_open_workspace_settings", value: {"path": path});
    return RustWorkspaceSettings.fromJson(s);
  }

  static Future<RustWorkspaceData> setWorkspaceSettings(
      String path, RustWorkspaceSettings settings) async {
    final ws = await Bindings.invokeAsync(
        key: "workspace.set_open_workspace_settings",
        value: {"path": path, "settings": settings.toJson()});
    return RustWorkspaceData.fromJson(ws);
  }

  static Future<RustFileTree> getOpenWorkspaceFileTree(String path) async {
    final f = await Bindings.invokeAsync(
        key: "workspace.get_open_workspace_file_tree", value: {"path": path});
    return RustFileTree.fromJson(f);
  }

  static Future<void> setOpenWorkspaceFileTreeSortType(
      String path, String sortType) async {
    await Bindings.invokeAsync(
        key: "workspace.set_open_workspace_file_tree_sort_type",
        value: {"path": path, "sortType": sortType});
  }

  static Future<void> setOpenWorkspaceFollowGitignore(
      String path, bool followGitignore) async {
    await Bindings.invokeAsync(
        key: "workspace.set_open_workspace_follow_gitignore",
        value: {"path": path, "followGitignore": followGitignore});
  }

  static Future<void> setOpenWorkspaceCustomIgnore(
      String path, String customIgnore) async {
    await Bindings.invokeAsync(
        key: "workspace.set_open_workspace_custom_ignore",
        value: {"path": path, "customIgnore": customIgnore});
  }

  static Future<void> resetOpenWorkspaceCustomIgnore(String path) async {
    await Bindings.invokeAsync(
        key: "workspace.reset_open_workspace_custom_ignore",
        value: {"path": path});
  }

  static Future<void> resetOpenWorkspaceHistroySnapshootCount(
      String path) async {
    await Bindings.invokeAsync(
        key: "workspace.reset_open_workspace_histroy_snapshoot_count",
        value: {"path": path});
  }

  static Future<void> resetOpenWorkspaceUploadAttachmentPath(
      String path) async {
    await Bindings.invokeAsync(
        key: "workspace.reset_open_workspace_upload_attachment_path",
        value: {"path": path});
  }

  static Future<void> resetOpenWorkspaceUploadImagePath(String path) async {
    await Bindings.invokeAsync(
        key: "workspace.reset_open_workspace_upload_image_path",
        value: {"path": path});
  }

  static Future<void> callOpenWorkspaceReinit(String path) async {
    await Bindings.invokeAsync(
        key: "workspace.call_open_workspace_reinit", value: {"path": path});
  }

  static Future<RustWorkspaceData?> getCurrentWorkspace() async {
    final path = RustWorkspaceManager.getCurrentOpenWorkspace();
    return await getWorkspace(path);
  }

  static Future<RustWorkspaceSettings?> getCurrentWorkspaceSettings() async {
    final path = checkCurrentOpenWorkspace();
    return await getWorkspaceSettings(path);
  }

  static Future<RustWorkspaceData> setCurrentWorkspaceSettings(
      RustWorkspaceSettings settings) async {
    final path = checkCurrentOpenWorkspace();
    return await setWorkspaceSettings(path, settings);
  }

  static Future<RustFileTree> getCurrentworkspaceFileTree() async {
    final path = checkCurrentOpenWorkspace();
    return await getOpenWorkspaceFileTree(path);
  }

  static Future<void> setCurrentWorkspaceFileTreeSortType(
      String sortType) async {
    final path = checkCurrentOpenWorkspace();
    await setOpenWorkspaceFileTreeSortType(path, sortType);
  }

  static Future<void> setCurrentWorkspaceFollowGitignore(
      bool followGitignore) async {
    final path = checkCurrentOpenWorkspace();
    await setOpenWorkspaceFollowGitignore(path, followGitignore);
  }

  static Future<void> setCurrentWorkspaceCustomIgnore(
      String customIgnore) async {
    final path = checkCurrentOpenWorkspace();
    await setOpenWorkspaceCustomIgnore(path, customIgnore);
  }

  static Future<void> resetCurrentWorkspaceCustomIgnore() async {
    final path = checkCurrentOpenWorkspace();
    await resetOpenWorkspaceCustomIgnore(path);
  }

  static Future<void> resetCurrentWorkspaceHistroySnapshootCount() async {
    final path = checkCurrentOpenWorkspace();
    await resetOpenWorkspaceHistroySnapshootCount(path);
  }

  static Future<void> resetCurrentWorkspaceUploadAttachmentPath() async {
    final path = checkCurrentOpenWorkspace();
    await resetOpenWorkspaceUploadAttachmentPath(path);
  }

  static Future<void> resetCurrentWorkspaceUploadImagePath() async {
    final path = checkCurrentOpenWorkspace();
    await resetOpenWorkspaceUploadImagePath(path);
  }

  static Future<void> reinitCurrentworkspace() async {
    final path = checkCurrentOpenWorkspace();
    await callOpenWorkspaceReinit(path);
  }

  static Future<void> test() async {
    if (!AppConfig.isDebug) return;
  }
}
