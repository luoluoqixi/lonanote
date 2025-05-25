import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class WorkspaceHomePage extends ConsumerStatefulWidget {
  const WorkspaceHomePage({super.key});

  @override
  ConsumerState<WorkspaceHomePage> createState() => _WorkspaceHomePageState();
}

class _WorkspaceHomePageState extends ConsumerState<WorkspaceHomePage> {

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PlatformPage(
      title: "工作区",
      subTitle: "工作区",
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: const Text("工作区"),
        ),
      ),
    );
  }
}
