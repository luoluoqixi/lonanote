import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/settings/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/controller/settings/settings_controller.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({
    super.key,
  });

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  @override
  void initState() {
    super.initState();
  }

  String? _validatorAutoSaveInterval(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '不能为空';
    }
    final n = double.tryParse(value);
    if (n == null) {
      return '不能解析值: $value';
    }
    if (n <= 0) {
      return '必须大于0';
    }
    return null;
  }

  void _setAutoOpenLastWorkspace(bool value) {
    SettingsController.setAutoOpenLastWorkspace(ref, value);
  }

  void _setAutoSave(bool value) {
    SettingsController.setAutoSave(ref, value);
  }

  void _setAutoSaveInterval(String value) {
    double? v = double.tryParse(value);
    if (v != null) {
      SettingsController.setAutoSaveInterval(ref, v);
      Navigator.of(context).pop();
    }
  }

  void _resetAutoSaveInterval() {
    SettingsController.resetSettingsAutoSaveInterval(ref);
    Navigator.of(context).pop();
  }

  void _setAutoSaveFocusChange(bool value) {
    SettingsController.setAutoSaveFocusChange(ref, value);
  }

  void _setShowFloatingToolbar(bool value) {
    SettingsController.setShowFloatingToolbar(ref, value);
  }

  Widget _buildBasicSettings(
    RustSettingsData settings,
    OtherSettings otherSettings,
  ) {
    return PlatformListView(
      insetGrouped: true,
      header: Text("基本设置"),
      children: [
        PlatformSwitchListTile(
          title: Text("自动打开上次工作区"),
          value: settings.autoOpenLastWorkspace == true,
          onChanged: _setAutoOpenLastWorkspace,
        ),
        PlatformSwitchListTile(
          title: Text("编辑时自动保存"),
          value: settings.autoSave == true,
          onChanged: _setAutoSave,
        ),
        PlatformListTileRaw(
          title: Text("自动保存间隔 (秒)"),
          onTap: () {
            AppRouter.showEditSheet(
              context,
              "自动保存间隔 (秒)",
              finishBtnText: "确认修改",
              inputHintText: "自动保存间隔 (秒)",
              initValue: settings.autoSaveInterval != null
                  ? settings.autoSaveInterval.toString()
                  : "",
              onFinish: _setAutoSaveInterval,
              validator: _validatorAutoSaveInterval,
              customButtonText: "重置",
              onCustomButtonTap: (_, __) => _resetAutoSaveInterval(),
            );
          },
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                settings.autoSaveInterval != null
                    ? "${settings.autoSaveInterval} 秒"
                    : "",
                style: TextStyle(fontSize: 14),
              ),
              SizedBox(width: 8),
              Icon(ThemeIcons.chevronRight(context)),
            ],
          ),
        ),
        PlatformSwitchListTile(
          title: Text("关闭页面时自动保存"),
          value: settings.autoSaveFocusChange == true,
          onChanged: _setAutoSaveFocusChange,
        ),
        PlatformSwitchListTile(
          title: Text("显示悬浮工具栏"),
          value: otherSettings.showFloatingToolbar,
          onChanged: _setShowFloatingToolbar,
        ),
      ],
    );
  }

  Widget _buildOtherSettings(RustSettingsData settings) {
    return PlatformListView(
      insetGrouped: true,
      header: Text("更多"),
      children: [
        PlatformListTileRaw(
          title: Text("个性化"),
          trailing: Icon(ThemeIcons.chevronRight(context)),
          onTap: () => AppRouter.jumpToPersonalizationSettingsPage(context),
        ),
        PlatformListTileRaw(
          title: Text("关于"),
          trailing: Icon(ThemeIcons.chevronRight(context)),
          onTap: () => AppRouter.jumpToAboutPage(context),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider.select((s) => s.settings));
    final otherSettings =
        ref.watch(settingsProvider.select((s) => s.otherSettings));
    return PlatformSimplePage(
      titleText: '设置',
      child: settings == null
          ? Text("加载中...")
          : Column(
              children: [
                _buildBasicSettings(settings, otherSettings),
                _buildOtherSettings(settings),
              ],
            ),
    );
  }
}
