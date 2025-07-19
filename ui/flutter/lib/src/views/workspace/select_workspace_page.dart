import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/store/ui_store.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_btn.dart';
import 'package:lonanote/src/widgets/platform_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:lonanote/src/widgets/tools/select_sheet.dart';
import 'package:pull_down_button/pull_down_button.dart';

enum WorkspaceSortType {
  updateTime,
  updateTimeRev,
  createTime,
  createTimeRev,
  name,
  nameRev,
}

class SelectWorkspacePage extends ConsumerStatefulWidget {
  final bool initOpen;

  const SelectWorkspacePage({
    super.key,
    this.initOpen = false,
  });

  @override
  ConsumerState<SelectWorkspacePage> createState() =>
      _SelectWorkspacePageState();
}

class _SelectWorkspacePageState extends ConsumerState<SelectWorkspacePage>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController(
    keepScrollOffset: true,
  );
  WorkspaceSortType _sortType = WorkspaceSortType.updateTime;

  bool _isLoading = false;

  bool _isSelectionMode = false;
  final Set<String> _selectedPaths = {};

  late bool audoOpenWorkspace = false;
  bool loadingWorkspace = true;

  // 当滚动条处于拖拽状态时, 由于 Flutter 手势穿透, 需要禁用一些事件处理保证体验
  bool _isDragActive = false;

  @override
  void initState() {
    super.initState();
    initAutoOpen();
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

  void initAutoOpen() {
    final settings = ref.read(settingsProvider).settings;
    if (!widget.initOpen) return;
    audoOpenWorkspace = settings?.autoOpenLastWorkspace == true;
    if (audoOpenWorkspace) {
      initLastWorkspace();
    }
  }

  void initLastWorkspace() async {
    final lastWorkspace = await WorkspaceManagerController.getLastWorkspace();
    logger.i("上次打开工作区: $lastWorkspace");
    if (lastWorkspace != null) {
      try {
        await WorkspaceManagerController.openWorkspace(ref, lastWorkspace);
        if (mounted) {
          AppRouter.jumpToWorkspaceHomePage(context);
        }
      } catch (e) {
        logger.e(e);
      }
    }
  }

  void _handleDragIsActiveChanged(bool value) {
    if (value == _isDragActive) return;
    setState(() {
      _isDragActive = value;
    });
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
    final workspaces = ref.read(workspaceProvider).workspaces;
    if (workspaces != null) {
      for (final path in _selectedPaths) {
        final wsIndex = workspaces.indexWhere((w) => w.path == path);
        if (wsIndex >= 0) {
          await _deleteWorkspace(workspaces[wsIndex], deleteFile);
        }
      }
    }
    _closeSelectWorkspaceMode();
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

  void _selectWorkspaceMode() {
    setState(() {
      _isSelectionMode = true;
    });
  }

  void _closeSelectWorkspaceMode() {
    setState(() {
      _isSelectionMode = false;
      _selectedPaths.clear();
    });
  }

  String? _validatorWorkspaceName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入工作区名称';
    }
    final invalidChars = RegExp(r'[\/\\:\*\?"<>\|]');
    if (invalidChars.hasMatch(value)) {
      return '工作区名称中不能包含特殊字符: / \\ : * ? " < > | ';
    }
    return null;
  }

  void _createWorkspace(String value) async {
    final workspaceName = value.trim();

    // setState(() {
    //   _isLoading = true;
    // });

    try {
      final path =
          await WorkspaceManagerController.createWorkspace(ref, workspaceName);
      if (mounted) {
        try {
          await WorkspaceManagerController.openWorkspace(ref, path);
          if (mounted) {
            Navigator.of(context).pop();
            final ws = WorkspaceManagerController.getCurrentWorkspace(ref);
            if (ws != null) {
              AppRouter.jumpToWorkspaceHomePage(context);
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
          if (mounted) {
            DialogTools.showDialog(
              context: context,
              title: "错误",
              content: LoggerUtility.errorShow("打开工作区失败", e),
              okText: "确定",
            );
          }
        }
      }
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("创建工作区失败", e),
          okText: "确定",
        );
      }
    } finally {
      // if (mounted) {
      //   setState(() {
      //     _isLoading = false;
      //   });
      // }
    }
  }

  void _createWorkspaceClick() {
    AppRouter.showEditSheet(
      context,
      "创建工作区",
      finishBtnText: "创建并打开",
      inputHintText: "工作区名称",
      initValue: "新建工作区",
      onFinish: _createWorkspace,
      validator: _validatorWorkspaceName,
      pageName: "/create_workspace",
    );
  }

  void _sortClick() {
    final sortTypes = [
      SelectSheetItem(
        value: WorkspaceSortType.updateTime.index,
        title: "按打开时间排序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectSheetItem(
        value: WorkspaceSortType.updateTimeRev.index,
        title: "按打开时间倒序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectSheetItem(
        value: WorkspaceSortType.createTime.index,
        title: "按创建时间排序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectSheetItem(
        value: WorkspaceSortType.createTimeRev.index,
        title: "按创建时间倒序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectSheetItem(
        value: WorkspaceSortType.name.index,
        title: "按名称排序",
        icon: ThemeIcons.sortName(context),
      ),
      SelectSheetItem(
        value: WorkspaceSortType.nameRev.index,
        title: "按名称倒序",
        icon: ThemeIcons.sortName(context),
      ),
    ];
    AppRouter.showSelectSheet(
      context,
      title: "排序方式",
      items: sortTypes,
      currentValue: _sortType.index,
      onChange: (t) {
        setState(() {
          _sortType = WorkspaceSortType.values[t];
          UIStore.setSortType(t);
        });
        Navigator.of(context).pop();
      },
      pageName: "/sort_workspace",
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
      await WorkspaceManagerController.openWorkspace(ref, workspace.path);
      if (mounted) {
        final ws = WorkspaceManagerController.getCurrentWorkspace(ref);
        if (ws != null) {
          AppRouter.jumpToWorkspaceHomePage(context);
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
      await WorkspaceManagerController.deleteWorkspace(
          ref, workspace.path, deleteFile);
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

  void _renameWorkspace(RustWorkspaceMetadata workspace, String value) async {
    final workspaceName = value;

    _closeSelectWorkspaceMode();

    try {
      await WorkspaceManagerController.renameWorkspace(
          ref, workspace.path, workspaceName);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("重命名工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _renameWorkspaceClick(RustWorkspaceMetadata workspace) {
    AppRouter.showEditSheet(
      context,
      "重命名工作区",
      finishBtnText: "确认修改",
      inputHintText: "工作区名称",
      initValue: workspace.name,
      onFinish: (v) => _renameWorkspace(workspace, v),
      validator: _validatorWorkspaceName,
      pageName: "/rename_workspace",
    );
  }

  void _renameWorkspaceSelectClick(String path) {
    final workspaces = ref.read(workspaceProvider).workspaces;
    if (workspaces == null) return;
    final index = workspaces.indexWhere((f) => f.path == path);
    if (index >= 0) {
      _renameWorkspaceClick(workspaces[index]);
    }
  }

  Future<void> _refreshWorkspaces() async {
    try {
      // 刷新太快了, 加个延时假装一下在干活
      await Future.delayed(Duration(milliseconds: 300));
      await WorkspaceManagerController.refreshWorkspace(ref, true, true);
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
        icon: Text(
          selectAll ? "取消全选" : "全选",
          style: TextStyle(
            fontSize: 18,
          ),
        ),
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
        icon: Text(
          "完成",
          style: TextStyle(
            fontSize: 18,
          ),
        ),
        padding: EdgeInsets.all(8.0),
        onPressed: () {
          _closeSelectWorkspaceMode();
        },
      ),
    ];
  }

  List<Widget> _buildActions(
    List<RustWorkspaceMetadata>? workspaces,
    ColorScheme colorScheme,
  ) {
    return [
      PlatformPullDownButton(
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: "选择工作区",
            onTap: _selectWorkspaceMode,
            icon: ThemeIcons.select(context),
            enabled: workspaces?.isNotEmpty ?? false,
          ),
          PullDownMenuItem(
            title: "创建工作区",
            onTap: _createWorkspaceClick,
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
              onPressed: _createWorkspaceClick,
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
    return Slidable(
      key: ValueKey(workspace.path),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.4,
        children: [
          CustomSlidableAction(
            onPressed: (_) => _renameWorkspaceClick(workspace),
            backgroundColor: ThemeColors.getPrimaryColor(colorScheme),
            foregroundColor: ThemeColors.getTextColorReverse(colorScheme),
            child: Icon(
              ThemeIcons.edit(context),
              size: 24,
            ),
          ),
          CustomSlidableAction(
            onPressed: (_) => _deleteWorkspaceClick(workspace),
            backgroundColor: Colors.red,
            foregroundColor: ThemeColors.getTextColorReverse(colorScheme),
            child: Icon(
              ThemeIcons.delete(context),
              size: 24,
            ),
          ),
        ],
      ),
      child: PlatformListTileRaw(
        bgColor: Colors.transparent,
        onTap: _isDragActive
            ? null
            : () {
                if (_isDragActive) return;
                if (_isSelectionMode) {
                  _toggleSelection(workspace);
                } else {
                  _openWorkspace(workspace);
                }
              },
        onLongPress: _isSelectionMode || _isDragActive
            ? null
            : () {
                if (_isDragActive) return;
                // logger.i("long press");
                HapticFeedback.selectionClick();
                _selectWorkspaceMode();
                _toggleSelection(workspace);
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
        leading: Icon(
          ThemeIcons.workspace(context),
          size: 30,
          color: ThemeColors.getPrimaryColor(colorScheme),
        ),
        trailing: _isSelectionMode
            ? _buildSelectModeContent(workspace, isSelect)
            : Icon(ThemeIcons.chevronRight(context)),
        // : PlatformPullDownButton(
        //     itemBuilder: (context) => [
        //       PullDownMenuItem(
        //         title: '重命名',
        //         onTap: () => _renameWorkspaceClick(workspace),
        //       ),
        //       PullDownMenuItem(
        //         title: '删除',
        //         isDestructive: true,
        //         onTap: () => _deleteWorkspaceClick(workspace),
        //       ),
        //     ],
        //     buttonIcon: Icon(
        //       ThemeIcons.more(context),
        //       color: ThemeColors.getTextGreyColor(colorScheme),
        //       size: 24,
        //     ),
        //   ),
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
    return SlidableAutoCloseBehavior(
      child: PlatformListView(
        topMargin: 0.0,
        itemBuilder: (context, index) {
          final workspace = sortedWorkspaces[index];
          return _buildWorkspaceTile(colorScheme, workspace);
        },
        itemCount: count,
      ),
    );
  }

  Widget _buildFloatingToolbar() {
    final isSelectOnlyOne = _selectedPaths.length == 1;
    final isNotEmpty = _selectedPaths.isNotEmpty;
    final isIOS = Theme.of(context).platform == TargetPlatform.iOS;

    return PlatformFloatingToolbar(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      contentPadding:
          EdgeInsets.symmetric(horizontal: 20, vertical: isIOS ? 5 : 10),
      children: [
        Text("已选择 ${_selectedPaths.length} 个"),
        Row(
          children: [
            if (isSelectOnlyOne)
              PlatformIconBtn(
                icon: Icon(ThemeIcons.rename(context)),
                onPressed: () =>
                    _renameWorkspaceSelectClick(_selectedPaths.first),
              ),
            PlatformIconBtn(
              icon: Icon(
                ThemeIcons.delete(context),
                color: isNotEmpty ? Colors.red : Colors.grey,
              ),
              onPressed: isNotEmpty ? _confirmBatchDelete : null,
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
      title: Row(
        children: [
          Text("工作区"),
          const SizedBox(width: 10),
          // Icon(
          //   ThemeIcons.workspace(context),
          //   size: 18,
          // ),
        ],
      ),
      scrollKey: const PageStorageKey("HomePageScrollKey"),
      scrollController: _scrollController,
      onScrollbarDragIsActiveChanged: _handleDragIsActiveChanged,
      subTitleText: "选择工作区",
      showScrollbar: true,
      isLoading: _isLoading,
      onRefresh: _isSelectionMode ? null : _refreshWorkspaces,
      isHome: true,
      onWillPop: () async {
        if (_isSelectionMode) {
          _closeSelectWorkspaceMode();
          return Future.value(false);
        }
        return Future.value(true);
      },
      backgroundColor: ThemeColors.getBgColor(colorScheme),
      titleActions: [
        if (_isSelectionMode) ..._buildSelectModeActions(workspaces),
        if (!_isSelectionMode) ..._buildActions(workspaces, colorScheme),
      ],
      stacks: [
        if (_isSelectionMode) _buildFloatingToolbar(),
      ],
      contents: [
        // 选择模式下, 增加底部边距, 不然会被FloatingToolbar挡住最下方的Tile
        if (_isSelectionMode)
          const SliverToBoxAdapter(
            child: SizedBox(
              height: 100,
              width: double.infinity,
            ),
          ),
        const SliverToBoxAdapter(
          child: SizedBox(
            height: 30,
            width: double.infinity,
          ),
        ),
      ],
      child: _buildWorkspacesList(context, colorScheme, workspaces),
    );
  }
}
