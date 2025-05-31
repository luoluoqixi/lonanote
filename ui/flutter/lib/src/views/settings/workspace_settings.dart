import 'package:flutter/material.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class WorkspaceSettingsPage extends StatelessWidget {
  final RustWorkspaceData workspace;
  const WorkspaceSettingsPage({
    super.key,
    required this.workspace,
  });

  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      titleText: '工作区设置',
      child: Center(child: Text('工作区设置')),
    );
  }
}
