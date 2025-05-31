import 'package:flutter/material.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({
    super.key,
  });

  Widget _buildGlobalSettings() {
    return PlatformListView(
      insetGrouped: true,
      header: Text("标题"),
      children: [
        PlatformListTile(
          title: Text("1223"),
          onTap: () {},
        ),
        PlatformListTile(
          title: Text("1223"),
          onTap: () {},
        ),
        PlatformListTile(
          title: Text("1223"),
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildOtherSettings() {
    return Text("456");
  }

  @override
  Widget build(BuildContext context) {
    // final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformSimplePage(
      titleText: '设置',
      // backgroundColor: ThemeColors.getBg0Color(colorScheme),
      child: Column(
        children: [
          _buildGlobalSettings(),
          _buildOtherSettings(),
        ],
      ),
    );
  }
}
