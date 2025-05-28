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

  void _createWorkspace() {
    AppRouter.showCreateWorkspacePage(context);
  }

  void _selectOpenWorkspace() {}

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
          Utility.showDialog(
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

  void _deleteWorkspace(RustWorkspaceMetadata workspace) async {
    try {
      await WorkspaceManager.deleteWorkspace(ref, workspace.path);
    } catch (e) {
      logger.e(e);
      if (mounted) {
        Utility.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("删除工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _deleteWorkspaceClick(RustWorkspaceMetadata workspace) {
    Utility.showDialog(
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
        Utility.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("刷新工作区失败", e),
          okText: "确定",
        );
      }
    }
  }

  Widget _buildContent(BuildContext context, ColorScheme colorScheme) {
    final workspaces = ref.watch(workspaceProvider.select((s) => s.workspaces));

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
    final greyColor = ThemeColors.getTextGreyColor(colorScheme);
    return PlatformInkWell(
      onTap: () => _openWorkspace(workspace),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
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
            // 右侧下拉按钮
            PlatformPullDownButton(
              // buttonColor: ThemeColors.getTextGreyColor(colorScheme),
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
        PlatformPullDownButton(
          itemBuilder: (context) => [
            PullDownMenuItem(
              title: "创建工作区",
              onTap: _createWorkspace,
            ),
            PullDownMenuItem(
              title: "打开文件夹...",
              onTap: _selectOpenWorkspace,
            ),
            PullDownMenuItem(
              title: "设置",
              onTap: _openSettings,
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
