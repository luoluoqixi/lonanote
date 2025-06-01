import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class WorkspaceSettingsPage extends ConsumerStatefulWidget {
  final RustWorkspaceData workspace;
  const WorkspaceSettingsPage({
    super.key,
    required this.workspace,
  });

  @override
  ConsumerState<ConsumerStatefulWidget> createState() =>
      _WorkspaceSettingsPageState();
}

class _WorkspaceSettingsPageState extends ConsumerState<WorkspaceSettingsPage> {
  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      titleText: '工作区设置',
      child: Center(child: Text('工作区设置')),
    );
  }
}
