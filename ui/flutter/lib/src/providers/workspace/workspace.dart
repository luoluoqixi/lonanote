import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'workspace.g.dart';
part 'workspace.freezed.dart';

@riverpod
class Workspace extends _$Workspace {
  @override
  WorkspaceStore build() {
    updateCurrentWorkspace();
    updateWorkspaces();
    return WorkspaceStore(
      currentWorkspace: null,
      workspaces: null,
      isWorkspaceLoading: false,
    );
  }

  Future<void> updateCurrentWorkspace() async {
    final workspace = await RustWorkspace.getCurrentWorkspace();
    state = state.copyWith(currentWorkspace: workspace);
  }

  Future<void> updateWorkspaces() async {
    final workspaces = await RustWorkspaceManager.getWorkspacesMetadata();
    state = state.copyWith(workspaces: workspaces);
  }
}

@freezed
sealed class WorkspaceStore with _$WorkspaceStore {
  const factory WorkspaceStore({
    RustWorkspaceData? currentWorkspace,
    List<RustWorkspaceMetadata>? workspaces,
    bool? isWorkspaceLoading,
  }) = _WorkspaceStore;
}
