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

  SliverList _buildContent(BuildContext context) {
    final workspaces = ref.watch(workspaceProvider.select((s) => s.workspaces));
    final colorScheme = Theme.of(context).colorScheme;
    final count = workspaces?.length ?? 0;
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
            ),
            _buildContent(context),
          ],
        ),
      ),
    );
  }
}
