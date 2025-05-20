import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/log.dart';
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

  SliverList _buildContent() {
    final workspaces = [
      {
        'name': 'test1',
        'path': '/workspaces/test1',
        'lastOpenTime': '2025-05-16 01:39:00'
      },
      {
        'name': 'test2',
        'path': '/workspaces/test2',
        'lastOpenTime': '2025-05-16 01:39:00'
      },
      {
        'name': 'test3',
        'path': '/workspaces/test3',
        'lastOpenTime': '2025-05-16 01:39:00'
      },
    ];
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final workspace = workspaces[index];
          return Column(
            children: [
              _buildWorkspaceTile(workspace),
              const Divider(
                height: 1,
                thickness: 0.1,
                indent: 16,
                endIndent: 16,
              ),
            ],
          );
        },
        childCount: workspaces.length,
      ),
    );
  }

  Widget _buildWorkspaceTile(Map<String, String> workspace) {
    return PlatformWidget(
      material: (_, __) => _buildTileContent(workspace),
      cupertino: (_, __) => _buildTileContent(workspace),
    );
  }

  Widget _buildTileContent(Map<String, String> workspace) {
    return InkWell(
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
              workspace['name'] ?? '',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              workspace['path'] ?? '',
              style: const TextStyle(
                fontSize: 13,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '上次打开时间: ${workspace['lastOpenTime'] ?? ''}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
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
    final backgroundColor = colorScheme.surface;
    return PlatformScaffold(
      backgroundColor: backgroundColor,
      body: SafeArea(
        top: false,
        child: Scrollbar(
          controller: _scrollController,
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              ScrollAppBar(
                title: "露娜笔记",
                subTitle: "选择工作区",
              ),
              _buildContent(),
            ],
          ),
        ),
      ),
    );
  }
}
