import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/router/router.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/overlay/global_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:lonanote/src/widgets/tools/search_sheet.dart';
import 'package:lonanote/src/widgets/tools/select_sheet.dart';
import 'package:pull_down_button/pull_down_button.dart';

class WorkspaceFilesPage extends ConsumerStatefulWidget {
  final String? parentPath;
  const WorkspaceFilesPage({
    super.key,
    this.parentPath,
  });

  @override
  ConsumerState<WorkspaceFilesPage> createState() => _WorkspaceFilesPageState();
}

class _WorkspaceFilesPageState extends ConsumerState<WorkspaceFilesPage> {
  bool _isSelectionMode = false;
  bool _isLoading = false;

  RustFileNode? fileNode;
  final Set<String> _selectedPaths = {};

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    setState(() {
      _isLoading = true;
    });
    _reinitFileNode().then((_) {
      setState(() {
        _isLoading = false;
      });
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _listenFloatingToolbar(BuildContext context) {
    if (ModalRoute.of(context)?.isCurrent != true) return;
    ref.listen<FloatingToolbarEvent?>(
      floatingToolbarEventProvider,
      (previous, next) {
        if (next != null) {
          if (next.type == 'add_file') {
            _createFileClick();
          } else if (next.type == 'add_folder') {
            _createFolderClick();
          } else if (next.type == 'search') {
            _searchClick();
          }
          ref.read(floatingToolbarEventProvider.notifier).state = null;
        }
      },
    );
  }

  Future<void> _reinitFileNode() async {
    // 刷新太快了, 加个延时假装一下在干活
    await Future.delayed(Duration(milliseconds: 300));
    final ws = ref.read(workspaceProvider.select((s) => s.currentWorkspace));
    if (ws == null) {
      logger.e("current workspace is null");
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: "初始化工作区失败, 当前工作区不存在",
          okText: "确定",
        );
      }
      return;
    }

    try {
      final otherSettings =
          ref.read(settingsProvider.select((w) => w.otherSettings));
      final fileNode = await WorkspaceController.getWorkspaceFileNode(
        ref,
        widget.parentPath,
        otherSettings.fileSortType,
      );
      setState(() {
        this.fileNode = fileNode;
      });
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("初始化工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _switchWorkspace() async {
    await WorkspaceManagerController.unloadWorkspace(ref);
    if (mounted) {
      AppRouter.jumpToSelectWorkspacePage(context);
    }
  }

  bool isShowCreateTime(RustFileSortType sortType) {
    return sortType == RustFileSortType.createTime ||
        sortType == RustFileSortType.createTimeRev;
  }

  void _toggleSelection(RustFileNode node) {
    setState(() {
      final path = node.path;
      if (_selectedPaths.contains(path)) {
        _selectedPaths.remove(path);
      } else {
        _selectedPaths.add(path);
      }
    });
  }

  bool _isSelectAll() {
    final children = fileNode?.children;
    final count = children?.length ?? 0;
    return count == _selectedPaths.length;
  }

  void _selectAll() {
    final children = fileNode?.children;
    setState(() {
      _selectedPaths.clear();
      if (children != null) {
        for (final child in children) {
          _selectedPaths.add(child.path);
        }
      }
    });
  }

  void _unSelectAll() {
    setState(() {
      _selectedPaths.clear();
    });
  }

  void _batchDeleteFileNode() async {
    if (fileNode?.children != null) {
      final children = fileNode!.children;
      for (final path in _selectedPaths) {
        final index = children!.indexWhere((child) => child.path == path);
        if (index >= 0) {
          _deleteNode(children[index]);
        }
      }
    }
    if (mounted) {
      await _reinitFileNode();
    }
    _closeSelectMode();
  }

  void _confirmBatchDelete() {
    HapticFeedback.selectionClick();
    DialogTools.showDialog(
      context: context,
      title: "确认删除",
      content: "确定删除所选的 ${_selectedPaths.length} 个文件或文件夹？",
      cancelText: "取消",
      okText: "删除",
      isDange: true,
      onOkPressed: () {
        _batchDeleteFileNode();
        return null;
      },
    );
  }

  void _confirmDelete(RustFileNode node) {
    HapticFeedback.selectionClick();
    final isDirectory = node.isDirectory();
    final type = isDirectory ? "文件夹" : "文件";
    DialogTools.showDialog(
      context: context,
      title: "确认删除$type",
      content: "确定删除$type ${node.path} 吗？",
      cancelText: "取消",
      okText: "删除",
      isDange: true,
      onOkPressed: () {
        _deleteNode(node);
        _reinitFileNode();
        return null;
      },
    );
  }

  void _deleteNode(RustFileNode node) {
    final filePath = _getFullFilePath(node.path);
    try {
      WorkspaceController.deleteFileOrFolder(
        ref,
        filePath,
      );
    } catch (e) {
      logger.e(e);
      DialogTools.showDialog(
        context: context,
        title: "错误",
        content: LoggerUtility.errorShow("删除失败", e),
        okText: "确定",
      );
    }
  }

  void _renameNode(RustFileNode node) {
    HapticFeedback.selectionClick();
    final isDirectory = node.isDirectory();
    final type = isDirectory ? "文件夹" : "文件";
    AppRouter.showEditSheet(
      context,
      "重命名$type",
      finishBtnText: "确认修改",
      inputHintText: "$type名称",
      initValue: node.path,
      pageName: "/rename_file_node",
      onFinish: (v) async {
        final rawFilePath = _getFullFilePath(node.path);
        final targetFilePath = _getFullFilePath(v);

        var isSuccess = false;
        try {
          WorkspaceController.renameFileOrFolder(
            ref,
            rawFilePath,
            targetFilePath,
          );
          isSuccess = true;
        } catch (e) {
          logger.e(e);
          DialogTools.showDialog(
            context: context,
            title: "错误",
            content: LoggerUtility.errorShow("重命名失败", e),
            okText: "确定",
          );
        }
        if (isSuccess) {
          Navigator.of(context).pop();
          _closeSelectMode();
          await _reinitFileNode();
        }
      },
      validator: isDirectory ? _validatorFolderName : _validatorFileName,
    );
  }

  void _renameNodeSelect(String path) {
    if (fileNode?.children == null) return;
    final index = fileNode?.children?.indexWhere((f) => f.path == path);
    if (index != null && index >= 0) {
      _renameNode(fileNode!.children![index]);
    }
  }

  void _openSelectMode() {
    setState(() {
      _isSelectionMode = true;
    });
    final r = ref.read(routerProvider.notifier);
    r.setHideGlobalFloatingToolbar(true);
  }

  void _closeSelectMode() {
    setState(() {
      _isSelectionMode = false;
      _selectedPaths.clear();
    });
    final r = ref.read(routerProvider.notifier);
    r.setHideGlobalFloatingToolbar(false);
  }

  Widget _buildSelectModeContent(
    RustFileNode node,
    bool isSelect,
  ) {
    return PlatformIconBtn(
      icon: Icon(
        ThemeIcons.radio(context, isSelect),
      ),
      onPressed: () {
        _toggleSelection(node);
      },
    );
  }

  String? _validatorFolderName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入文件夹名称';
    }
    final invalidChars = RegExp(r'[\/\\:\*\?"<>\|]');
    if (invalidChars.hasMatch(value)) {
      return '文件夹名称中不能包含特殊字符: / \\ : * ? " < > | ';
    }
    return null;
  }

  String? _validatorFileName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入笔记名称';
    }
    final invalidChars = RegExp(r'[\/\\:\*\?"<>\|]');
    if (invalidChars.hasMatch(value)) {
      return '笔记名称中不能包含特殊字符: / \\ : * ? " < > | ';
    }
    return null;
  }

  String _getShowName(RustFileNode node) {
    final name = node.path;
    if (node.isFile()) {
      final ext = Utility.getExtName(name);
      if (ext != null && Utility.isMarkdown(ext)) {
        return name.substring(0, name.length - (ext.length + 1));
      }
    }
    return name;
  }

  String _getNameAddMd(String name) {
    if (name.lastIndexOf(".") < 0) {
      name = "$name.md";
    }
    return name;
  }

  String _getFullFilePath(String name) {
    if (widget.parentPath != null) {
      name = "${widget.parentPath}/$name";
    }
    return name;
  }

  void _searchClick() {
    AppRouter.showBottomSheet(
      context,
      (context) => SearchSheet(),
      pageName: "/seatch",
    );
  }

  void _createFolder(String value) async {
    final folderName = value.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      WorkspaceController.createFolder(ref, _getFullFilePath(folderName));
      Navigator.of(context).pop();
      await _reinitFileNode();
      if (mounted) {}
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("创建文件夹失败", e),
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

  void _createFile(String value) async {
    var fileName = value.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      fileName = _getNameAddMd(fileName);
      WorkspaceController.createFile(ref, _getFullFilePath(fileName));
      Navigator.of(context).pop();
      await _reinitFileNode();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("创建笔记失败", e),
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

  void _createFileClick() {
    AppRouter.showEditSheet(
      context,
      "创建笔记",
      finishBtnText: "创建笔记",
      inputHintText: "笔记名称",
      initValue: "新建笔记",
      onFinish: _createFile,
      validator: _validatorFileName,
      pageName: "/create_file",
    );
  }

  void _createFolderClick() {
    AppRouter.showEditSheet(
      context,
      "创建文件夹",
      finishBtnText: "创建文件夹",
      inputHintText: "文件夹名称",
      initValue: "新建文件夹",
      onFinish: _createFolder,
      validator: _validatorFolderName,
      pageName: "/create_folder",
    );
  }

  void _sortModeClick() {
    final otherSettings =
        ref.read(settingsProvider.select((w) => w.otherSettings));
    final currentSortType = otherSettings.fileSortType;
    final sortTypes = [
      SelectItem(
        value: RustFileSortType.lastModifiedTime.index,
        title: "按修改时间排序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectItem(
        value: RustFileSortType.lastModifiedTimeRev.index,
        title: "按修改时间倒序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectItem(
        value: RustFileSortType.createTime.index,
        title: "按创建时间排序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectItem(
        value: RustFileSortType.createTimeRev.index,
        title: "按创建时间倒序",
        icon: ThemeIcons.schedule(context),
      ),
      SelectItem(
        value: RustFileSortType.name.index,
        title: "按名称排序",
        icon: ThemeIcons.sortName(context),
      ),
      SelectItem(
        value: RustFileSortType.nameRev.index,
        title: "按名称倒序",
        icon: ThemeIcons.sortName(context),
      ),
    ];
    AppRouter.showSelectSheet(
      context,
      sortTypes: sortTypes,
      currentSortType: currentSortType.index,
      onChange: (t) {
        setState(() {
          final sortType = RustFileSortType.values[t];
          final s = ref.read(settingsProvider.notifier);
          s.setFileSortType(sortType);
        });
        Navigator.of(context).pop();
        _reinitFileNode();
      },
      pageName: "/sort_file_node",
    );
  }

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _openWorkspaceSettings() {
    AppRouter.jumpToWorkspaceSettingsPage(context);
  }

  void _openFileNode(RustFileNode node) {
    if (node.isDirectory()) {
      String parentPath = node.path;
      if (widget.parentPath != null) {
        parentPath = "${widget.parentPath}/$parentPath";
      }
      AppRouter.jumpToPage(
        context,
        (context) {
          return WorkspaceFilesPage(
            parentPath: parentPath,
          );
        },
        pageName: "/workspace_files",
      );
    } else if (node.isFile()) {
      DialogTools.showDialog(
        context: context,
        title: "提示",
        content: "待实现",
        okText: "确定",
      );
    } else {
      DialogTools.showDialog(
        context: context,
        title: "错误",
        content: "未知文件, 无法打开",
        okText: "确定",
      );
    }
  }

  Widget _buildWorkspaceFiles(ColorScheme colorScheme) {
    final children = fileNode?.children;
    final count = children?.length ?? 0;
    if (count == 0 && _isLoading) {
      return SizedBox(height: 300, child: Center(child: Text("加载中...")));
    }
    if (count == 0) {
      return SizedBox(height: 300, child: Center(child: Text("没有文件")));
    }
    return SlidableAutoCloseBehavior(
      child: PlatformListView(
        topMargin: 0.0,
        itemBuilder: (context, index) {
          final f = fileNode!.children![index];
          return _buildWorkspaceFile(colorScheme, f);
        },
        itemCount: count,
      ),
    );
  }

  IconData _getFileIcon(RustFileNode node) {
    final ext = Utility.getExtName(node.path);
    if (ext == null) return ThemeIcons.file(context);
    if (Utility.isMarkdown(ext)) {
      return ThemeIcons.markdown(context);
    } else if (Utility.isImage(ext)) {
      return ThemeIcons.image(context);
    } else if (Utility.isVideo(ext)) {
      return ThemeIcons.video(context);
    }
    return ThemeIcons.file(context);
  }

  Widget _buildWorkspaceFile(ColorScheme colorScheme, RustFileNode node) {
    final otherSettings =
        ref.read(settingsProvider.select((w) => w.otherSettings));
    final isSelect = _isSelectionMode && _selectedPaths.contains(node.path);
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);

    final isFile = node.isFile();
    final isDirectory = node.isDirectory();

    var name = _getShowName(node);

    return Slidable(
      key: ValueKey(node.path),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.4,
        children: [
          CustomSlidableAction(
            onPressed: (_) => _renameNode(node),
            backgroundColor: ThemeColors.getPrimaryColor(colorScheme),
            foregroundColor: ThemeColors.getTextColorReverse(colorScheme),
            child: Icon(
              ThemeIcons.edit(context),
              size: 24,
            ),
          ),
          CustomSlidableAction(
            onPressed: (_) => _confirmDelete(node),
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
        onTap: () {
          if (_isSelectionMode) {
            _toggleSelection(node);
          } else {
            _openFileNode(node);
          }
        },
        onLongPress: _isSelectionMode
            ? null
            : () {
                HapticFeedback.selectionClick();
                _openSelectMode();
                _toggleSelection(node);
              },
        forcePressColor: isSelect,
        minTileHeight: 72,
        title: Text(
          name,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(
          TimeUtility.formatTimestamp(
            isShowCreateTime(otherSettings.fileSortType)
                ? node.createTime
                : node.lastModifiedTime,
          ),
          style: TextStyle(
            fontSize: 12,
            color: greyColor,
          ),
        ),
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isFile)
              Icon(
                _getFileIcon(node),
                size: 40,
                color: ThemeColors.getPrimaryColor(colorScheme),
              ),
            if (isDirectory)
              Icon(
                ThemeIcons.folder(context),
                size: 40,
                color: ThemeColors.getPrimaryColor(colorScheme),
              ),
          ],
        ),
        trailing: _isSelectionMode
            ? _buildSelectModeContent(node, isSelect)
            : isDirectory
                ? Icon(ThemeIcons.chevronRight(context))
                : null,
      ),
    );
  }

  List<Widget> _buildSelectModeActions(RustWorkspaceData? workspace) {
    final selectAll = _isSelectAll();

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
            _selectAll();
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
          _closeSelectMode();
        },
      ),
    ];
  }

  List<Widget> _buildActions(ColorScheme colorScheme) {
    final isNotEmpty = fileNode?.children?.isNotEmpty;
    return [
      PlatformPullDownButton(
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: "选择",
            onTap: _openSelectMode,
            icon: ThemeIcons.select(context),
            enabled: isNotEmpty ?? false,
          ),
          PullDownMenuItem(
            title: "创建笔记",
            onTap: _createFileClick,
            icon: ThemeIcons.add(context),
          ),
          PullDownMenuItem(
            title: "创建文件夹",
            onTap: _createFolderClick,
            icon: ThemeIcons.addFolder(context),
          ),
          const PullDownMenuDivider.large(),
          PullDownMenuItem(
            title: "排序方式",
            onTap: _sortModeClick,
            icon: ThemeIcons.sort(context),
          ),
          const PullDownMenuDivider.large(),
          PullDownMenuItem(
            title: "切换工作区",
            onTap: _switchWorkspace,
            icon: ThemeIcons.swap(context),
          ),
          PullDownMenuItem(
            title: "工作区设置",
            onTap: _openWorkspaceSettings,
            icon: ThemeIcons.tune(context),
          ),
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

  Widget _buildSelectFloatingToolbar() {
    final isSelectOnlyOne = _selectedPaths.length == 1;
    final isNotEmpty = _selectedPaths.isNotEmpty;
    return PlatformFloatingToolbar(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text("已选择 ${_selectedPaths.length} 个"),
        Row(
          children: [
            if (isSelectOnlyOne)
              PlatformIconBtn(
                icon: Icon(ThemeIcons.rename(context)),
                onPressed: () => _renameNodeSelect(_selectedPaths.first),
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

  Widget? _buildFloatingToolbar(bool showFloatingToolbar) {
    if (_isSelectionMode) {
      return _buildSelectFloatingToolbar();
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    _listenFloatingToolbar(context);
    final workspace =
        ref.watch(workspaceProvider.select((s) => s.currentWorkspace));
    final otherSettings =
        ref.watch(settingsProvider.select((s) => s.otherSettings));
    final colorScheme = ThemeColors.getColorScheme(context);
    var title = workspace?.metadata.name ?? "";
    if (widget.parentPath != null) {
      final paths = widget.parentPath!.split("/");
      title = paths[paths.length - 1];
    }
    final floatingToolbar =
        _buildFloatingToolbar(otherSettings.showFloatingToolbar);
    return PlatformPage(
      titleText: title,
      scrollController: _scrollController,
      isHome: widget.parentPath == null,
      showScrollbar: true,
      isLoading: _isLoading,
      onRefresh: _isSelectionMode ? null : _reinitFileNode,
      titleActions: [
        if (_isSelectionMode) ..._buildSelectModeActions(workspace),
        if (!_isSelectionMode) ..._buildActions(colorScheme),
      ],
      stacks: [
        if (floatingToolbar != null) floatingToolbar,
      ],
      contents: [
        // 选择模式下, 增加底部边距, 不然会被FloatingToolbar挡住最下方的Tile
        if (otherSettings.showFloatingToolbar || _isSelectionMode)
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
      child: _buildWorkspaceFiles(colorScheme),
    );
  }
}
