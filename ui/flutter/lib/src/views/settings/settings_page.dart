import 'package:flutter/material.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({
    super.key,
  });

  Widget _buildGlobalSettings() {
    return PlatformListView(
      header: Text("标题"),
      children: [],
    );
  }

  Widget _buildOtherSettings() {
    return Text("456");
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return PlatformSimplePage(
      titleText: '设置',
      backgroundColor: ThemeColors.getBg0Color(colorScheme),
      child: Column(
        children: [
          _buildGlobalSettings(),
          _buildOtherSettings(),
        ],
      ),
    );
  }
}
