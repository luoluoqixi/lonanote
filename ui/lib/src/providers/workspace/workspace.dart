import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
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

  Future<void> updateAll() async {
    await updateWorkspaces();
    await updateCurrentWorkspace();
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
