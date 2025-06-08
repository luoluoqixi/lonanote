import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:lonanote/src/bindings/api/settings/settings.dart';
import 'package:lonanote/src/bindings/api/settings/types.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/store/ui_store.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'settings.g.dart';
part 'settings.freezed.dart';

@riverpod
class Settings extends _$Settings with WidgetsBindingObserver {
  @override
  SettingsStore build() {
    ref.onDispose(() => WidgetsBinding.instance.removeObserver(this));
    WidgetsBinding.instance.addObserver(this);
    updateSettings();
    final color = getPrimaryColor();
    return SettingsStore(
      theme: ThemeSettings(
        platformBrightness: _getSystemTheme(),
        themeMode: getThemeMode(),
        primaryColor: getPrimaryColorFromEnum(color),
        primaryColorEnum: color,
      ),
      settings: RustSettings.settings,
      otherSettings: OtherSettings(
        showFloatingToolbar: getShowFloatingToolbar(),
      ),
    );
  }

  Future<void> updateSettings() async {
    final settings = await RustSettings.getSettings();
    state = state.copyWith(settings: settings);
  }

  Brightness _getSystemTheme() {
    return WidgetsBinding.instance.platformDispatcher.platformBrightness;
  }

  @override
  void didChangePlatformBrightness() {
    state = state.copyWith(
      theme: state.theme.copyWith(
        platformBrightness: _getSystemTheme(),
      ),
    );
  }

  void setThemeMode(ThemeMode themeMode) {
    state = state.copyWith(
      theme: state.theme.copyWith(
        themeMode: themeMode,
      ),
    );
    UIStore.setThemeMode(themeMode.index);
  }

  void _setPrimaryColor(ThemePrimaryColor color, Color c) {
    state = state.copyWith(
      theme: state.theme.copyWith(
        primaryColor: c,
        primaryColorEnum: color,
      ),
    );
  }

  void setPrimaryColor(ThemePrimaryColor color) {
    final c = getPrimaryColorFromEnum(color);
    _setPrimaryColor(color, c);
    UIStore.setThemePrimaryColor(color.name);
  }

  static ThemeMode getThemeMode() {
    final themeMode = UIStore.getThemeMode();
    return themeMode != null ? ThemeMode.values[themeMode] : ThemeMode.system;
  }

  static ThemePrimaryColor getPrimaryColor() {
    final c = UIStore.getThemePrimaryColor();
    if (c != null) {
      try {
        final color = ThemePrimaryColor.values.byName(c);
        return color;
      } catch (e) {
        logger.e("parse primary color error: $c");
      }
    }
    return ThemePrimaryColor.blue;
  }

  static bool getShowFloatingToolbar() {
    final v = UIStore.getShowFloatingToolbar();
    return v ?? true;
  }

  void setShowFloatingToolbar(bool value) {
    state = state.copyWith(
      otherSettings: state.otherSettings.copyWith(
        showFloatingToolbar: value,
      ),
    );
    UIStore.setShowFloatingToolbar(value);
  }

  static Color getPrimaryColorFromEnum(ThemePrimaryColor color) {
    if (color == ThemePrimaryColor.blue) {
      return Colors.blue;
    } else if (color == ThemePrimaryColor.green) {
      return Colors.green;
    } else if (color == ThemePrimaryColor.red) {
      return Colors.red;
    } else if (color == ThemePrimaryColor.yellow) {
      return Colors.yellow;
    } else if (color == ThemePrimaryColor.purple) {
      return Colors.purple;
    } else if (color == ThemePrimaryColor.pink) {
      return Colors.pink;
    } else if (color == ThemePrimaryColor.cyan) {
      return Colors.cyan;
    } else if (color == ThemePrimaryColor.orange) {
      return Colors.orange;
    }
    return Colors.blue;
  }
}

@freezed
sealed class SettingsStore with _$SettingsStore {
  const factory SettingsStore({
    required ThemeSettings theme,
    required OtherSettings otherSettings,
    RustSettingsData? settings,
  }) = _SettingsStore;
}

@freezed
sealed class ThemeSettings with _$ThemeSettings {
  const factory ThemeSettings({
    required Brightness platformBrightness,
    required ThemeMode themeMode,
    required Color primaryColor,
    required ThemePrimaryColor primaryColorEnum,
  }) = _ThemeSettings;
}

@freezed
sealed class OtherSettings with _$OtherSettings {
  const factory OtherSettings({
    required bool showFloatingToolbar,
  }) = _OtherSettings;
}

enum ThemePrimaryColor {
  blue,
  green,
  red,
  yellow,
  purple,
  pink,
  cyan,
  orange,
}
