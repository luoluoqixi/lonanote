import 'package:flutter/cupertino.dart';
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
    return SafeArea(
        top: true,
        bottom: false,
        child: ColoredBox(
          color: backgroundColor,
          child: buildContent(),
        ));
  }

  PlatformAppBar? buildAppBar(ColorScheme colorScheme) {
    const title = Text("工作区");
    return PlatformAppBar(
      title: title,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = colorScheme.surface;
    return PlatformScaffold(
      appBar: buildAppBar(colorScheme),
      backgroundColor: backgroundColor,
      body: buildBody(colorScheme),
      material: (context, platform) => MaterialScaffoldData(
        extendBody: true,
      ),
    );
  }
}
