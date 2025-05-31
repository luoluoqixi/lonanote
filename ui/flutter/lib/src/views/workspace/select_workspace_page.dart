import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/store/ui_store.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/workspace/workspace_sort_select.dart';
import 'package:lonanote/src/widgets/platform_btn.dart';
import 'package:lonanote/src/widgets/platform_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:pull_down_button/pull_down_button.dart';

class SelectWorkspacePage extends ConsumerStatefulWidget {
  const SelectWorkspacePage({super.key});

  @override
  ConsumerState<SelectWorkspacePage> createState() =>
      _SelectWorkspacePageState();
}

class _SelectWorkspacePageState extends ConsumerState<SelectWorkspacePage>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  WorkspaceSortType _sortType = WorkspaceSortType.updateTime;

  bool _isLoading = false;

  bool _isSelectionMode = false;
  final Set<String> _selectedPaths = {};

  @override
  void initState() {
    super.initState();
    initStore();
  }

  Future<void> initStore() async {
    final type = await UIStore.getSortType();
    if (type != null) {
      setState(() {
        _sortType = WorkspaceSortType.values[type];
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  bool isShowCreateTime() {
    return _sortType == WorkspaceSortType.createTime ||
        _sortType == WorkspaceSortType.createTimeRev;
  }

  void _toggleSelection(RustWorkspaceMetadata workspace) {
    setState(() {
      final path = workspace.path;
      if (_selectedPaths.contains(path)) {
        _selectedPaths.remove(path);
      } else {
        _selectedPaths.add(path);
      }
    });
  }

  bool _isSelectAll(List<RustWorkspaceMetadata>? ws) {
    if (ws == null) return false;
    return ws.length == _selectedPaths.length;
  }

  void _selectAll(List<RustWorkspaceMetadata>? ws) {
    final ws = ref.read(workspaceProvider).workspaces;
    if (ws == null) return;
    setState(() {
      _selectedPaths.clear();
      for (final w in ws) {
        _selectedPaths.add(w.path);
      }
    });
  }

  void _unSelectAll() {
    setState(() {
      _selectedPaths.clear();
    });
  }

  List<RustWorkspaceMetadata> _getSortWorkspaces(
      List<RustWorkspaceMetadata> workspaces) {
    final sortedWorkspaces = [...workspaces]..sort((a, b) {
        if (_sortType == WorkspaceSortType.updateTime) {
          return TimeUtility.compareTime(b.updateTime, a.updateTime);
        } else if (_sortType == WorkspaceSortType.updateTimeRev) {
          return TimeUtility.compareTime(a.updateTime, b.updateTime);
        } else if (_sortType == WorkspaceSortType.createTime) {
          return TimeUtility.compareTime(b.createTime, a.createTime);
        } else if (_sortType == WorkspaceSortType.createTimeRev) {
          return TimeUtility.compareTime(a.createTime, b.createTime);
        } else if (_sortType == WorkspaceSortType.name) {
          return a.name.compareTo(b.name);
        } else if (_sortType == WorkspaceSortType.nameRev) {
          return b.name.compareTo(a.name);
        } else {
          return TimeUtility.compareTime(b.updateTime, a.updateTime);
        }
      });
    return sortedWorkspaces;
  }

  void _batchDeleteWorkspace(bool deleteFile) async {
    for (final path in _selectedPaths) {
      final ws = ref
          .read(workspaceProvider)
          .workspaces
          ?.firstWhere((w) => w.path == path);
      if (ws != null) {
        await _deleteWorkspace(ws, deleteFile);
      }
    }
    setState(() {
      _isSelectionMode = false;
      _selectedPaths.clear();
    });
  }

  void _confirmBatchDelete() {
    DialogTools.showDialog(
      context: context,
      title: "确认删除",
      content: "确定删除所选的 ${_selectedPaths.length} 个工作区？",
      cancelText: "取消",
      okText: "仅删除工作区",
      isDange: true,
      onOkPressed: () {
        _batchDeleteWorkspace(false);
        return null;
      },
      actions: [
        DialogTools.dialogAction(context, "同时删除本地文件", onPressed: () {
          _batchDeleteWorkspace(true);
          return null;
        }, isDange: true)
      ],
    );
  }

  void _selectWorkspace() {
    setState(() {
      _isSelectionMode = true;
    });
  }

  void _createWorkspace() {
    AppRouter.showCreateWorkspacePage(context);
  }

  void _sortClick() {
    AppRouter.showBottomSheet(
      context,
      (context) => WorkspaceSortSelect(
        currentSortType: _sortType,
        onChange: (t) {
          setState(() {
            _sortType = t;
            UIStore.setSortType(t.index);
          });
          Navigator.of(context).pop();
        },
      ),
    );
  }

  // void _selectOpenWorkspace() async {
  //   Utility.showDialog(
  //     context: context,
  //     title: "提示",
  //     content: "暂未支持",
  //     okText: "确定",
  //   );
  //   // String? selectedDirectory = await FilePicker.platform.getDirectoryPath();
  //   // if (selectedDirectory != null) {
  //   //   // logger.i("select: $selectedDirectory");
  //   // }
  // }

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _openWorkspace(RustWorkspaceMetadata workspace) async {
    setState(() {
      _isLoading = true;
    });
    try {
      await WorkspaceManager.openWorkspace(ref, workspace.path);
      if (mounted) {
        final ws = WorkspaceManager.getCurrentWorkspace(ref);
        if (ws != null) {
          AppRouter.jumpToWorkspaceHomePage(context, ws);
        } else {
          DialogTools.showDialog(
            context: context,
            title: "错误",
            content: "打开工作区失败, 未获取到工作区数据",
            okText: "确定",
          );
        }
      }
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("打开工作区失败", e),
          okText: "确定",
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteWorkspace(
    RustWorkspaceMetadata workspace,
    bool deleteFile,
  ) async {
    try {
      await WorkspaceManager.deleteWorkspace(ref, workspace.path, deleteFile);
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("删除工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _deleteWorkspaceClick(RustWorkspaceMetadata workspace) {
    DialogTools.showDialog(
        context: context,
        title: "提示",
        content: "确定要删除工作区 ${workspace.name} 吗？",
        okText: "仅删除工作区",
        cancelText: "取消",
        isDange: true,
        onOkPressed: () {
          _deleteWorkspace(workspace, false);
          return null;
        },
        actions: [
          DialogTools.dialogAction(context, "同时删除本地文件", onPressed: () {
            _deleteWorkspace(workspace, true);
            return null;
          }, isDange: true)
        ]);
  }

  void _renameWorkspaceClick(RustWorkspaceMetadata workspace) {
    AppRouter.showRenameWorkspacePage(context, workspace);
  }

  Future<void> _refreshWorkspaces() async {
    try {
      // 刷新太快了, 加个延时假装一下在干活
      await Future.delayed(Duration(milliseconds: 200));
      await WorkspaceManager.refreshWorkspace(ref, true, true);
      logger.i("refresh workspace finish");
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("刷新工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  List<Widget> _buildSelectModeActions(List<RustWorkspaceMetadata>? ws) {
    final selectAll = _isSelectAll(ws);
    return [
      PlatformIconBtn(
        icon: Text(selectAll ? "取消全选" : "全选"),
        padding: EdgeInsets.all(10.0),
        onPressed: () {
          if (selectAll) {
            _unSelectAll();
          } else {
            _selectAll(ws);
          }
        },
      ),
      PlatformIconBtn(
        icon: Text("完成"),
        padding: EdgeInsets.all(8.0),
        onPressed: () {
          setState(() {
            _isSelectionMode = false;
            _selectedPaths.clear();
          });
        },
      ),
    ];
  }

  Widget _buildSelectModeContent(
    RustWorkspaceMetadata workspace,
    bool isSelect,
  ) {
    return PlatformIconBtn(
      icon: Icon(
        ThemeIcons.radio(context, isSelect),
      ),
      onPressed: () {
        _toggleSelection(workspace);
      },
    );
  }

  Widget _buildNoWorkspace(BuildContext context, ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '暂无工作区',
              style: TextStyle(
                fontSize: 16,
                color: ThemeColors.getTextGreyColor(colorScheme),
              ),
            ),
            const SizedBox(height: 16),
            PlatformBtn(
              width: double.infinity,
              onPressed: _createWorkspace,
              labelText: "创建工作区",
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkspaceTile(
    ColorScheme colorScheme,
    RustWorkspaceMetadata workspace,
  ) {
    final isSelect =
        _isSelectionMode && _selectedPaths.contains(workspace.path);
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);
    return PlatformListTile(
      onTap: () {
        if (_isSelectionMode) {
          _toggleSelection(workspace);
        } else {
          _openWorkspace(workspace);
        }
      },
      forcePressColor: isSelect,
      minTileHeight: 72,
      title: Text(
        workspace.name,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        TimeUtility.formatTimestamp(
          isShowCreateTime() ? workspace.createTime : workspace.updateTime,
        ),
        style: TextStyle(
          fontSize: 12,
          color: greyColor,
        ),
      ),
      leading: _isSelectionMode
          ? _buildSelectModeContent(workspace, isSelect)
          : null,
      trailing: PlatformPullDownButton(
        buttonOnPressed: (showMenu) {
          if (!_isSelectionMode) {
            showMenu();
          }
        },
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: '重命名',
            onTap: () => _renameWorkspaceClick(workspace),
          ),
          PullDownMenuItem(
            title: '删除',
            isDestructive: true,
            onTap: () => _deleteWorkspaceClick(workspace),
          ),
        ],
        buttonIcon: Icon(
          _isSelectionMode ? null : ThemeIcons.more(context),
          color: ThemeColors.getTextGreyColor(colorScheme),
          size: 24,
        ),
      ),
    );
  }

  Widget _buildWorkspacesList(
    BuildContext context,
    ColorScheme colorScheme,
    List<RustWorkspaceMetadata>? workspaces,
  ) {
    final count = workspaces?.length ?? 0;
    if (count == 0) {
      return _buildNoWorkspace(context, colorScheme);
    }
    final sortedWorkspaces = _getSortWorkspaces(workspaces!);
    return PlatformListView(
      itemBuilder: (context, index) {
        final workspace = sortedWorkspaces[index];
        return _buildWorkspaceTile(colorScheme, workspace);
      },
      itemCount: count,
    );
  }

  Widget _buildFloatingToolbar() {
    return PlatformFloatingToolbar(
      children: [
        Text("已选择 ${_selectedPaths.length} 个"),
        Row(
          children: [
            PlatformIconBtn(
              icon: Icon(
                ThemeIcons.delete(context),
                color: _selectedPaths.isNotEmpty ? Colors.red : Colors.grey,
              ),
              onPressed: _selectedPaths.isNotEmpty ? _confirmBatchDelete : null,
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final workspaces = ref.watch(workspaceProvider.select((s) => s.workspaces));
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformPage(
      titleText: "工作区",
      subTitleText: "选择工作区",
      isLoading: _isLoading,
      onRefresh: _isSelectionMode ? null : _refreshWorkspaces,
      backgroundColor: ThemeColors.getBg0Color(colorScheme),
      titleActions: [
        if (_isSelectionMode) ..._buildSelectModeActions(workspaces),
        if (!_isSelectionMode)
          PlatformPullDownButton(
            itemBuilder: (context) => [
              PullDownMenuItem(
                title: "选择工作区",
                onTap: _selectWorkspace,
                icon: ThemeIcons.select(context),
                enabled: workspaces?.isNotEmpty ?? false,
              ),
              PullDownMenuItem(
                title: "创建工作区",
                onTap: _createWorkspace,
                icon: ThemeIcons.add(context),
              ),
              const PullDownMenuDivider.large(),
              PullDownMenuItem(
                title: "排序方式",
                icon: ThemeIcons.sort(context),
                onTap: _sortClick,
              ),

              // PullDownMenuItem(
              //   title: "打开文件夹...",
              //   onTap: _selectOpenWorkspace,
              // ),
              const PullDownMenuDivider.large(),
              PullDownMenuItem(
                title: "设置",
                onTap: _openSettings,
                icon: ThemeIcons.settings(context),
              ),
            ],
            buttonIcon: Icon(
              ThemeIcons.more(context),
              color: ThemeColors.getTextGreyColor(colorScheme),
              size: 28,
            ),
          ),
      ],
      // contents: [_buildContent(context, colorScheme, workspaces)],
      stacks: [
        if (_isSelectionMode) _buildFloatingToolbar(),
      ],
      child: _buildWorkspacesList(context, colorScheme, workspaces),
    );
  }
}
