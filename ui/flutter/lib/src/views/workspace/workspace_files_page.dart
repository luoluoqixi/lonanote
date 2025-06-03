import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utils/time_utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:pull_down_button/pull_down_button.dart';

class WorkspaceFilesPage extends ConsumerStatefulWidget {
  final bool isRoot;
  const WorkspaceFilesPage({
    super.key,
    required this.isRoot,
  });

  @override
  ConsumerState<WorkspaceFilesPage> createState() => _WorkspaceFilesPageState();
}

class _WorkspaceFilesPageState extends ConsumerState<WorkspaceFilesPage> {
  bool _isSelectionMode = false;
  bool _isLoading = false;

  RustFileNode? fileNode;

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
        null,
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
    final folderName = value.trim();

    setState(() {
      _isLoading = true;
    });

    try {
      WorkspaceController.createFile(ref, folderName);
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

  void _openSelectModeClick() {
    setState(() {
      _isSelectionMode = true;
    });
  }

  void _createFileClick() {
    AppRouter.showEditSheet(
      context,
      "创建笔记",
      finishBtnText: "创建笔记",
      inputHintText: "笔记名称",
      initValue: "新建笔记.md",
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

  Widget _buildWorkspaceFile(ColorScheme colorScheme, RustFileNode node) {
    // final isSelect =
    //     _isSelectionMode && _selectedPaths.contains(workspace.path);
    final isSelect = false;

    final greyColor = ThemeColors.getTextGreyColor(colorScheme);
    return PlatformListTileRaw(
      onTap: () {
        // if (_isSelectionMode) {
        //   _toggleSelection(workspace);
        // } else {
        //   _openFile(workspace);
        // }
      },
      forcePressColor: isSelect,
      minTileHeight: 72,
      title: Text(
        node.path,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        TimeUtility.formatTimestamp(
          // isShowCreateTime() ? node.createTime : node.lastModifiedTime,
          node.lastModifiedTime,
        ),
        style: TextStyle(
          fontSize: 12,
          color: greyColor,
        ),
      ),
      // leading: _isSelectionMode
      //     ? _buildSelectModeContent(workspace, isSelect)
      //     : null,
      trailing: PlatformPullDownButton(
        disable: _isSelectionMode,
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: '重命名',
            onTap: () => {},
          ),
          PullDownMenuItem(
            title: '删除',
            isDestructive: true,
            onTap: () => {},
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

  @override
  Widget build(BuildContext context) {
    final workspace =
        ref.watch(workspaceProvider.select((s) => s.currentWorkspace));
    final colorScheme = ThemeColors.getColorScheme(context);
    final wsName = workspace?.metadata.name ?? "";
    return PlatformPage(
      titleText: wsName,
      isHome: widget.isRoot,
      isLoading: _isLoading,
      onRefresh: _isSelectionMode ? null : _reinitFileNode,
      titleActions: [
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
      ],
      child: _buildWorkspaceFiles(colorScheme),
    );
  }
}
