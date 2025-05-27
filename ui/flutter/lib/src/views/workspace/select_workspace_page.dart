import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
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

  bool _isLoading = false;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Widget _buildContent(BuildContext context) {
    final workspaces = ref.watch(workspaceProvider.select((s) => s.workspaces));
    final colorScheme = Theme.of(context).colorScheme;
    final count = workspaces?.length ?? 0;
    if (count == 0) {
      return SliverToBoxAdapter(
        child: _buildNoWorkspace(context),
      );
    }
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final workspace = workspaces![index];
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
              onPressed: createWorkspace,
              labelText: "创建工作区",
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkspaceTile(
      ColorScheme colorScheme, RustWorkspaceMetadata workspace) {
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);
    return PlatformInkWell(
      onTap: () => openWorkspace(workspace),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
            const SizedBox(height: 4),
            Text(
              workspace.path,
              style: TextStyle(
                fontSize: 13,
                color: greyColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '上次打开时间: ${workspace.lastOpenTime}',
              style: TextStyle(
                fontSize: 12,
                color: greyColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void createWorkspace() {
    AppRouter.showCreateWorkspacePage(context);
  }

  void openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void openWorkspace(RustWorkspaceMetadata workspace) async {
    setState(() {
      _isLoading = true;
    });
    try {
      await WorkspaceManager.openWorkspace(ref, workspace.path);
      if (mounted) {
        AppRouter.jumpToWorkspaceHomePage(context);
      }
    } catch (e) {
      logger.e(e);
      if (mounted) {
        Utility.showDialog(
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

  @override
  Widget build(BuildContext context) {
    return PlatformPage(
      title: "工作区",
      subTitle: "选择工作区",
      isLoading: _isLoading,
      titleActions: [
        PlatformPullDownButton(
          itemBuilder: (context) => [
            PullDownMenuItem(
              title: "创建工作区",
              onTap: createWorkspace,
            ),
            PullDownMenuItem(
              title: "设置",
              onTap: openSettings,
            ),
          ],
          buttonIcon: Icon(
            ThemeIcons.more(context),
            size: 28,
          ),
        ),
      ],
      contents: [_buildContent(context)],
    );
  }
}
