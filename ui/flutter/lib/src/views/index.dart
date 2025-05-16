import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class Index extends ConsumerStatefulWidget {
  const Index({super.key});

  @override
  ConsumerState<Index> createState() => _IndexState();
}

class _IndexState extends ConsumerState<Index>
    with SingleTickerProviderStateMixin {
  Widget buildContent() {
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

    return const Text("123");
  }

  Widget buildBody(ColorScheme colorScheme) {
    final backgroundColor = colorScheme.surface;
    return Center(
      child: ColoredBox(
        color: Colors.yellow,
        child: Text("body"),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = colorScheme.surface;
    return PlatformScaffold(
      backgroundColor: backgroundColor,
      body: NestedScrollView(
        // 折叠头部
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              pinned: true,
              floating: false,
              // backgroundColor: Colors.red,
              // 停留的标题
              title: Text("工作区"),
              // 展开高度
              expandedHeight: 200,
              // 可折叠的
              flexibleSpace: FlexibleSpaceBar(
                background: Center(
                  child: Text("折叠区域"),
                ),
              ),
            )
          ];
        },
        body: buildBody(colorScheme),
      ),
    );
  }
}
