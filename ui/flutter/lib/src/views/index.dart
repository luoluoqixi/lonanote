import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/widgets/scroll_app_bar.dart';

class Index extends ConsumerStatefulWidget {
  const Index({super.key});

  @override
  ConsumerState<Index> createState() => _IndexState();
}

class _IndexState extends ConsumerState<Index>
    with SingleTickerProviderStateMixin {
  Widget buildContent() {
    // final workspaces = [
    //   {
    //     'name': 'test1',
    //     'path': '/workspaces/test1',
    //     'lastOpenTime': '2025-05-16 01:39:00'
    //   },
    //   {
    //     'name': 'test2',
    //     'path': '/workspaces/test2',
    //     'lastOpenTime': '2025-05-16 01:39:00'
    //   },
    //   {
    //     'name': 'test3',
    //     'path': '/workspaces/test3',
    //     'lastOpenTime': '2025-05-16 01:39:00'
    //   },
    // ];
    return const Text("123");
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = colorScheme.surface;
    return PlatformScaffold(
      backgroundColor: backgroundColor,
      body: CustomScrollView(
        slivers: [
          ScrollAppBar(
            title: "工作区",
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                buildContent(),
              ],
            ),
          )
        ],
      ),
    );
  }
}
