import 'package:flutter/foundation.dart';

import '../../bindings.dart';
import '../path/path.dart';
import './types.dart';

class RustWorkspaceManager {
  static String? currentWorkspace;

  static String? getCurrentOpenWorkspace() {
    return currentWorkspace;
  }

  static void setCurrentOpenWorkspace(String? path) {
    currentWorkspace = path;
  }

  static String getWorkspaceDir() {
    return RustPath.getHomeDir();
  }

  static Future<void> initSetup(String path) async {
    await Bindings.invokeAsync(
      key: "workspace.init_setup",
      value: {"path": path},
    );
  }

  static Future<void> setWorkspaceRootPath(
    String path,
    String newPath,
    bool isMove,
  ) async {
    await Bindings.invokeAsync(
      key: "workspace.set_workspace_root_path",
      value: {"path": path, "newPath": newPath, "isMove": isMove},
    );
  }

  static Future<void> setWorkspaceName(
    String path,
    String newName,
    bool isMove,
  ) async {
    await Bindings.invokeAsync(
      key: "workspace.set_workspace_name",
      value: {"path": path, "newName": newName, "isMove": isMove},
    );
  }

  static Future<void> removeWorkspace(String path, bool deleteFile) async {
    await Bindings.invokeAsync(
      key: "workspace.remove_workspace",
      value: {"path": path, "deleteFile": deleteFile},
    );
  }

  static Future<List<RustWorkspaceMetadata>> getWorkspacesMetadata() async {
    final res = await Bindings.invokeAsync(
      key: "workspace.get_workspaces_metadata",
    );
    final list = res as List<dynamic>;
    List<RustWorkspaceMetadata> workspaces = list
        .map((e) => RustWorkspaceMetadata.fromJson(e as Map<String, dynamic>))
        .toList();
    return workspaces;
  }

  static Future<String> createWorkspace(String name) async {
    final path = name;
    await Bindings.invokeAsync(
      key: "workspace.create_workspace",
      value: {"path": path},
    );
    return path;
  }

  static Future<void> openWorkspaceByPath(String path) async {
    // const isOpen = await isOpenWorkspace(path);
    // if (isOpen) {
    //   throw new Error(`workspace has been opened: ${path}`);
    // }
    await Bindings.invokeAsync(
      key: "workspace.open_workspace_by_path",
      value: {"path": path},
    );
    setCurrentOpenWorkspace(path);
    // logger.i("open workspace: ${}");
  }

  static Future<void> unloadWorkspaceByPath(String path) async {
    setCurrentOpenWorkspace(null);
    await Bindings.invokeAsync(
      key: "workspace.unload_workspace_by_path",
      value: {"path": path},
    );
  }

  static Future<String?> getLastWorkspace() async {
    return await Bindings.invokeAsync(key: "workspace.get_last_workspace");
  }

  static Future<bool?> checkWorkspacePathExist(String workspacePath) async {
    return await Bindings.invokeAsync(
      key: "workspace.check_workspace_path_exist",
      value: {"workspacePath": workspacePath},
    );
  }

  static Future<bool?> checkWorkspacePathLegal(String workspacePath) async {
    return await Bindings.invokeAsync(
      key: "workspace.check_workspace_path_legal",
      value: {"workspacePath": workspacePath},
    );
  }

  static Future<RustWorkspaceSaveData> getWorkspaceSavedata(
    String workspacePath,
  ) async {
    final res = await Bindings.invokeAsync(
      key: "workspace.get_workspace_savedata",
      value: {"workspacePath": workspacePath},
    );
    return RustWorkspaceSaveData.fromJson(res);
  }

  static Future<void> setWorkspaceSavedata(
    String workspacePath,
    RustWorkspaceSaveData data,
  ) async {
    return await Bindings.invokeAsync(
      key: "workspace.set_workspace_savedata",
      value: {"workspacePath": workspacePath, "data": data.toJson()},
    );
  }

  static Future<void> test() async {
    if (kDebugMode) {
      final workspaces = await getWorkspacesMetadata();
      print(
        "RustWorkspaceManager.getWorkspacesMetadata = ${workspaces.length}",
      );
      final lastWorkspace = await getLastWorkspace();
      print("RustWorkspaceManager.getLastWorkspace = $lastWorkspace");
    }
  }
}
