import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/views/workspace/workspace_files_page.dart';

class WorkspaceHomePage extends ConsumerStatefulWidget {
  const WorkspaceHomePage({super.key});

  @override
  ConsumerState<WorkspaceHomePage> createState() => _WorkspaceHomePageState();
}

class _WorkspaceHomePageState extends ConsumerState<WorkspaceHomePage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WorkspaceFilesPage(
      isRoot: true,
    );
  }
}
