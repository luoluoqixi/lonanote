import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/settings/settings_page.dart';
import 'package:lonanote/src/views/workspace/create_workspace_page.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_popup_menu_button.dart';

class Index extends ConsumerStatefulWidget {
  const Index({super.key});

  @override
  ConsumerState<Index> createState() => _IndexState();
}

class _IndexState extends ConsumerState<Index>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();

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
      return _buildNoWorkspace(context);
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

    return SliverToBoxAdapter(
      child: Center(
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
                onPressed: createWorkspace,
                labelText: "创建工作区",
              ),
            ],
          ),
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
    Navigator.push(
      context,
      platformPageRoute(
        context: context,
        builder: (context) => CreateWorkspacePage(),
      ),
    );
  }

  void openSettings() {
    Navigator.push(
      context,
      platformPageRoute(
        context: context,
        builder: (context) => SettingsPage(),
      ),
    );
  }

  void openWorkspace(RustWorkspaceMetadata workspace) {
    logger.i("打开工作区${workspace.name}");
  }

  void onMoreOptionClick(PlatformPopupMenuOption option) {
    if (option.value == "create-workspace") {
      createWorkspace();
    } else if (option.value == "settings") {
      openSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PlatformPage(
      title: "露娜笔记",
      subTitle: "选择工作区",
      titleActions: [
        PlatformPopupMenuButton(
          options: [
            PlatformPopupMenuOption(
              value: "create-workspace",
              label: "创建工作区",
              onClick: onMoreOptionClick,
            ),
            PlatformPopupMenuOption(
              value: "settings",
              label: "设置",
              onClick: onMoreOptionClick,
            ),
          ],
          icon: Icon(
            ThemeIcons.more(context),
            size: 28,
          ),
        ),
      ],
      contents: [_buildContent(context)],
    );
  }
}
