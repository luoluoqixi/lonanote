import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/scroll_app_bar.dart';

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
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    logger.i("点击创建工作区");
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('创建工作区'),
                  style: TextButton.styleFrom(
                    side: BorderSide(
                      color: colorScheme.primary,
                    ),
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
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
      onTap: () {
        logger.i("click item");
      },
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

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = ThemeColors.getBgColor(colorScheme);
    final menuItemTextStyle =
        TextStyle(color: ThemeColors.getTextColor(colorScheme));
    return PlatformScaffold(
      backgroundColor: backgroundColor,
      body: SafeArea(
        top: false,
        bottom: false,
        child: CustomScrollView(
          slivers: [
            ScrollAppBar(
              title: "露娜笔记",
              subTitle: "选择工作区",
              actions: [
                PopupMenuButton<String>(
                  icon: Icon(
                    isMaterial(context) ? Icons.more_vert : Icons.more_horiz,
                    size: 28,
                  ),
                  tooltip: '更多操作',
                  offset: const Offset(0, 50),
                  elevation: 1,
                  color: colorScheme.surface,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(10)),
                  ),
                  onSelected: (value) {
                    if (value == 'add') {
                      logger.i("创建工作区");
                    } else if (value == 'settings') {
                      logger.i("点击设置");
                    }
                  },
                  itemBuilder: (BuildContext context) => [
                    PopupMenuItem<String>(
                      value: 'add',
                      child: Text('创建工作区', style: menuItemTextStyle),
                    ),
                    PopupMenuItem<String>(
                      value: 'settings',
                      child: Text('设置', style: menuItemTextStyle),
                    ),
                  ],
                ),
              ],
            ),
            _buildContent(context),
          ],
        ),
      ),
    );
  }
}
