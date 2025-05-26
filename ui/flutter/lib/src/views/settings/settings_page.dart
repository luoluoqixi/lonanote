import 'package:flutter/material.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      title: '设置',
      child: Center(child: Text('这是设置页面')),
    );
  }
}
