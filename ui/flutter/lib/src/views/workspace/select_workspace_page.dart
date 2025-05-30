import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/workspace/workspace_sort_select.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
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
  WorkspaceSortType _sortType = WorkspaceSortType.time;

  bool _isLoading = false;

  bool _isSelectionMode = false;
  final Set<String> _selectedPaths = {};

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
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

  void _batchDeleteWorkspace() async {
    for (final path in _selectedPaths) {
      final ws = ref
          .read(workspaceProvider)
          .workspaces
          ?.firstWhere((w) => w.path == path);
      if (ws != null) {
        await _deleteWorkspace(ws);
      }
    }
    setState(() {
      _isSelectionMode = false;
      _selectedPaths.clear();
    });
  }

  // ignore: unused_element
  void _confirmBatchDelete() {
    DialogTools.showDialog(
      context: context,
      title: "确认删除",
      content: "确定删除所选的 ${_selectedPaths.length} 个工作区？",
      okText: "删除",
      isDange: true,
      onOkPressed: () {
        _batchDeleteWorkspace();
        return null;
      },
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

  Future<void> _deleteWorkspace(RustWorkspaceMetadata workspace) async {
    try {
      await WorkspaceManager.deleteWorkspace(ref, workspace.path);
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
      okText: "删除",
      cancelText: "取消",
      isDange: true,
      onOkPressed: () {
        _deleteWorkspace(workspace);
        return null;
      },
    );
  }

  void _renameWorkspaceClick(RustWorkspaceMetadata workspace) {
    AppRouter.showRenameWorkspacePage(context, workspace);
  }

  Future<void> _refreshWorkspaces() async {
    try {
      // 刷新太快了, 加个延时假装一下在干活
      await Future.delayed(Duration(milliseconds: 200));
      await WorkspaceManager.refreshWorkspace(ref);
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

  List<Widget> _buildSelectModeActions() {
    return [
      PlatformIconButton(
        icon: Text("完成"),
        onPressed: () {
          setState(() {
            _isSelectionMode = false;
            _selectedPaths.clear();
          });
        },
      ),
      // IconButton(
      //   icon: const Icon(Icons.delete),
      //   onPressed: () {
      //     _confirmBatchDelete();
      //   },
      // ),
    ];
  }

  Widget _buildSelectModeContent(
      RustWorkspaceMetadata workspace, bool isSelect) {
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: PlatformIconButton(
        icon: Icon(
          isSelect ? Icons.check_circle : Icons.radio_button_unchecked,
        ),
        // color: Theme.of(context).colorScheme.primary,
        onPressed: () {
          _toggleSelection(workspace);
        },
      ),
    );
  }

  Widget _buildContent(BuildContext context, ColorScheme colorScheme) {
    final workspaces = ref.watch(workspaceProvider.select((s) => s.workspaces));

    final count = workspaces?.length ?? 0;
    if (count == 0) {
      return SliverToBoxAdapter(
        child: _buildNoWorkspace(context),
      );
    }
    final sortedWorkspaces = [...workspaces!]..sort((a, b) {
        if (_sortType == WorkspaceSortType.time) {
          return b.lastOpenTime.compareTo(a.lastOpenTime);
        } else if (_sortType == WorkspaceSortType.timeRev) {
          return a.lastOpenTime.compareTo(b.lastOpenTime);
        } else if (_sortType == WorkspaceSortType.name) {
          return a.name.compareTo(b.name);
        } else if (_sortType == WorkspaceSortType.nameRev) {
          return b.name.compareTo(a.name);
        } else {
          return b.lastOpenTime.compareTo(a.lastOpenTime);
        }
      });
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final workspace = sortedWorkspaces[index];
          return Column(
            children: [
              _buildWorkspaceTile(colorScheme, workspace),
              const Divider(
                height: 1,
                thickness: 0.1,
                indent: 16,
                endIndent: 16,
              ),
            ],
          );
        },
        childCount: count,
      ),
    );
  }

  Widget _buildNoWorkspace(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

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
            PlatformButton(
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
      ColorScheme colorScheme, RustWorkspaceMetadata workspace) {
    final isSelect =
        _isSelectionMode && _selectedPaths.contains(workspace.path);
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);
    return PlatformInkWell(
      onTap: () {
        if (_isSelectionMode) {
          _toggleSelection(workspace);
        } else {
          _openWorkspace(workspace);
        }
      },
      forcePressColor: isSelect,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (_isSelectionMode) _buildSelectModeContent(workspace, isSelect),
            // 左侧信息部分
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    workspace.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    TimeUtility.formatTimestamp(workspace.lastOpenTime),
                    style: TextStyle(
                      fontSize: 12,
                      color: greyColor,
                    ),
                  ),
                ],
              ),
            ),
            // 右侧下拉按钮
            PlatformPullDownButton(
              // buttonColor: ThemeColors.getTextGreyColor(colorScheme),
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
                ThemeIcons.more(context),
                color: ThemeColors.getTextGreyColor(colorScheme),
                size: 24,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return PlatformPage(
      title: "工作区",
      subTitle: "选择工作区",
      isLoading: _isLoading,
      onRefresh: _refreshWorkspaces,
      titleActions: [
        if (_isSelectionMode) ..._buildSelectModeActions(),
        if (!_isSelectionMode)
          PlatformPullDownButton(
            itemBuilder: (context) => [
              PullDownMenuItem(
                title: "选择工作区",
                onTap: _selectWorkspace,
                icon: ThemeIcons.select(context),
              ),
              PullDownMenuItem(
                title: "创建工作区",
                onTap: _createWorkspace,
                icon: ThemeIcons.add(context),
              ),
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
      contents: [_buildContent(context, colorScheme)],
    );
  }
}
