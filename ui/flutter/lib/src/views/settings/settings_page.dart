import 'package:flutter/material.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SettingsPage extends StatelessWidget {
  final RustWorkspaceData? workspace;

  const SettingsPage({
    super.key,
    this.workspace,
  });

  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      titleText: '设置',
      child: Center(child: Text('这是设置页面')),
    );
  }
}
