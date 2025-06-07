import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
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

  Future<void> _reinitFileNode() async {
    final ws = ref.read(workspaceProvider.select((s) => s.currentWorkspace));
    if (ws == null) {
      logger.e("current workspace is null");
      DialogTools.showDialog(
        context: context,
        title: "错误",
        content: "初始化工作区失败, 当前工作区不存在",
        okText: "确定",
      );
      return;
    }

    try {
      final fileNode = await WorkspaceController.getWorkspaceFileNode(
        ref,
        widget.parentPath,
        RustFileSortType.name,
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

  bool isShowCreateTime() {
    // return _sortType == WorkspaceSortType.createTime ||
    //     _sortType == WorkspaceSortType.createTimeRev;
    return false;
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
    // for (final path in _selectedPaths) {
    //   final ws = ref
    //       .read(workspaceProvider)
    //       .workspaces
    //       ?.firstWhere((w) => w.path == path);
    //   if (ws != null) {
    //     await _deleteWorkspace(ws, deleteFile);
    //   }
    // }
    // setState(() {
    //   _isSelectionMode = false;
    //   _selectedPaths.clear();
    // });
  }

  void _confirmBatchDelete() {
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

  void _openSelectModeClick() {
    setState(() {
      _isSelectionMode = true;
    });
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

  void _createFolder(String value) async {
    final folderName = value.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      WorkspaceController.createFolder(ref, folderName);
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
    final fileName = value.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      WorkspaceController.createFile(ref, fileName);
      Navigator.of(context).pop();
      await _reinitFileNode();
      if (mounted) {}
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
    );
  }

  void _sortModeClick() {}

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
      AppRouter.jumpToPage(context, (context) {
        return WorkspaceFilesPage(
          parentPath: parentPath,
        );
      });
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
      return Center(child: Text("加载中..."));
    }
    if (count == 0) {
      return Center(child: Text("没有文件"));
    }
    return PlatformListView(
      topMargin: 0.0,
      itemBuilder: (context, index) {
        final f = fileNode!.children![index];
        return _buildWorkspaceFile(colorScheme, f);
      },
      itemCount: count,
    );
  }

  IconData _getFileIcon(RustFileNode node) {
    final name = node.path;
    final index = name.lastIndexOf(".");
    if (index < 0) {
      return ThemeIcons.file(context);
    }
    final ext = name.substring(index + 1).toLowerCase();
    if (Utility.isImage(ext)) {
      return ThemeIcons.image(context);
    } else if (Utility.isVideo(ext)) {
      return ThemeIcons.video(context);
    }
    return ThemeIcons.file(context);
  }

  Widget _buildWorkspaceFile(ColorScheme colorScheme, RustFileNode node) {
    final isSelect = _isSelectionMode && _selectedPaths.contains(node.path);
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);

    final isFile = node.isFile();
    final isDirectory = node.isDirectory();

    var isMarkdown = false;
    var name = node.path;
    if (isFile) {
      final lowerName = name.toLowerCase();
      if (lowerName.endsWith(".md")) {
        isMarkdown = true;
        name = name.substring(0, name.length - 3);
      } else if (lowerName.endsWith(".markdown")) {
        isMarkdown = true;
        name = name.substring(0, name.length - 9);
      }
    }

    return PlatformListTileRaw(
      bgColor: Colors.transparent,
      onTap: () {
        if (_isSelectionMode) {
          _toggleSelection(node);
        } else {
          _openFileNode(node);
        }
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
          isShowCreateTime() ? node.createTime : node.lastModifiedTime,
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
              isMarkdown ? ThemeIcons.markdown(context) : _getFileIcon(node),
              size: 32,
              color: ThemeColors.getPrimaryColor(colorScheme),
            ),
          if (isDirectory)
            Icon(
              ThemeIcons.folder(context),
              size: 32,
              color: ThemeColors.getPrimaryColor(colorScheme),
            ),
          if (_isSelectionMode) const SizedBox(width: 8),
          if (_isSelectionMode) _buildSelectModeContent(node, isSelect),
        ],
      ),
      trailing: isDirectory ? Icon(ThemeIcons.chevronRight(context)) : null,
      // trailing: PlatformPullDownButton(
      //   disable: _isSelectionMode,
      //   itemBuilder: (context) => [
      //     PullDownMenuItem(
      //       title: '重命名',
      //       onTap: () => {},
      //     ),
      //     PullDownMenuItem(
      //       title: '删除',
      //       isDestructive: true,
      //       onTap: () => {},
      //     ),
      //   ],
      //   buttonIcon: Icon(
      //     _isSelectionMode ? null : ThemeIcons.more(context),
      //     color: ThemeColors.getTextGreyColor(colorScheme),
      //     size: 24,
      //   ),
      // ),
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
          setState(() {
            _isSelectionMode = false;
            _selectedPaths.clear();
          });
        },
      ),
    ];
  }

  List<Widget> _buildActions(ColorScheme colorScheme) {
    return [
      PlatformPullDownButton(
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: "选择",
            onTap: _openSelectModeClick,
            icon: ThemeIcons.select(context),
            // enabled: isNotEmpty ?? false,
          ),
          PullDownMenuItem(
            title: "创建笔记",
            onTap: _createFileClick,
            icon: ThemeIcons.add(context),
          ),
          PullDownMenuItem(
            title: "创建文件夹",
            onTap: _createFolderClick,
            icon: ThemeIcons.add(context),
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

  Widget? _buildFloatingToolbar() {
    if (_isSelectionMode) {
      return _buildSelectFloatingToolbar();
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final workspace =
        ref.watch(workspaceProvider.select((s) => s.currentWorkspace));
    final colorScheme = ThemeColors.getColorScheme(context);
    var title = workspace?.metadata.name ?? "";
    if (widget.parentPath != null) {
      final paths = widget.parentPath!.split("/");
      title = paths[paths.length - 1];
    }
    final floatingToolbar = _buildFloatingToolbar();
    return PlatformPage(
      titleText: title,
      isHome: widget.parentPath == null,
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
      child: _buildWorkspaceFiles(colorScheme),
    );
  }
}
