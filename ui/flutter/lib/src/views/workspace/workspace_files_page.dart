import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager_controller.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
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
  // bool _isSelectionMode = false;

  void _switchWorkspace() async {
    await WorkspaceManagerController.unloadWorkspace(ref);
    if (mounted) {
      AppRouter.jumpToSelectWorkspacePage(context);
    }
  }

  void _openSelectModeClick() {
    // setState(() {
    //   _isSelectionMode = true;
    // });
  }

  void _createFileClick() {}

  void _createFolderClick() {}

  void _sortModeClick() {}

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _openWorkspaceSettings() {
    AppRouter.jumpToWorkspaceSettingsPage(context);
  }

  Widget _buildWorkspaceFiles() {
    return Text("123");
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
      child: _buildWorkspaceFiles(),
    );
  }
}
