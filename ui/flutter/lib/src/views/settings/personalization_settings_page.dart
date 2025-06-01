import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:pull_down_button/pull_down_button.dart';

class PersonalizationSettingsPage extends ConsumerStatefulWidget {
  const PersonalizationSettingsPage({
    super.key,
  });

  @override
  ConsumerState<ConsumerStatefulWidget> createState() =>
      _PersonalizationSettingsPageState();
}

class _PersonalizationSettingsPageState
    extends ConsumerState<PersonalizationSettingsPage> {
  String _getThemeModeString(ThemeMode mode) {
    if (mode == ThemeMode.system) {
      return "跟随系统";
    } else if (mode == ThemeMode.light) {
      return "浅色主题";
    } else if (mode == ThemeMode.dark) {
      return "深色主题";
    }
    return "";
  }

  void _setThemeMode(ThemeMode mode) {
    final s = ref.read(settingsProvider.notifier);
    s.setThemeMode(mode);
  }

  String _getPrimaryColorString(ThemePrimaryColor color) {
    if (color == ThemePrimaryColor.blue) {
      return "蓝色";
    } else if (color == ThemePrimaryColor.green) {
      return "绿色";
    } else if (color == ThemePrimaryColor.red) {
      return "红色";
    } else if (color == ThemePrimaryColor.yellow) {
      return "黄色";
    } else if (color == ThemePrimaryColor.purple) {
      return "紫色";
    } else if (color == ThemePrimaryColor.pink) {
      return "粉色";
    } else if (color == ThemePrimaryColor.cyan) {
      return "青色";
    } else if (color == ThemePrimaryColor.orange) {
      return "橙色";
    }
    return "";
  }

  void _setPrimaryColor(ThemePrimaryColor color) {
    final s = ref.read(settingsProvider.notifier);
    s.setPrimaryColor(color);
  }

  Widget _buildThemes(BuildContext context) {
    final theme = ref.watch(settingsProvider.select((s) => s.theme));
    final currentThemeMode = theme.themeMode;
    final currentPrimaryColor = theme.primaryColorEnum;

    return PlatformListView(
      insetGrouped: true,
      topMargin: 0,
      header: const Text("主题"),
      children: [
        PlatformPullDownListTile(
          title: const Text("颜色模式"),
          selectValue: _getThemeModeString(currentThemeMode),
          itemBuilder: (BuildContext context) {
            return ThemeMode.values
                .map((v) => PullDownMenuItem.selectable(
                      onTap: () => _setThemeMode(v),
                      selected: currentThemeMode == v,
                      title: _getThemeModeString(v),
                    ))
                .toList();
          },
        ),
        PlatformPullDownListTile(
          title: const Text("主题色"),
          selectValue: _getPrimaryColorString(currentPrimaryColor),
          itemBuilder: (BuildContext context) {
            return ThemePrimaryColor.values
                .map((v) => PullDownMenuItem.selectable(
                      onTap: () => _setPrimaryColor(v),
                      selected: currentPrimaryColor == v,
                      title: _getPrimaryColorString(v),
                      icon: ThemeIcons.circle(context),
                      iconColor: Settings.getPrimaryColorFromEnum(v),
                    ))
                .toList();
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      titleText: '个性化',
      child: Column(
        children: [
          _buildThemes(context),
        ],
      ),
    );
  }
}
