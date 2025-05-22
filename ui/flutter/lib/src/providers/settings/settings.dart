import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'settings.g.dart';
part 'settings.freezed.dart';

@riverpod
class Settings extends _$Settings with WidgetsBindingObserver {
  @override
  SettingsStore build() {
    ref.onDispose(() => WidgetsBinding.instance.removeObserver(this));
    WidgetsBinding.instance.addObserver(this);
    return SettingsStore(
      theme: ThemeSettings(
        platformBrightness: _getSystemTheme(),
        themeMode: ThemeMode.system,
        primaryColor: Colors.pinkAccent,
      ),
    );
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
  }

  void setPrimaryColor(Color color) {
    state = state.copyWith(
      theme: state.theme.copyWith(
        primaryColor: color,
      ),
    );
  }
}

@freezed
sealed class SettingsStore with _$SettingsStore {
  const factory SettingsStore({
    required ThemeSettings theme,
  }) = _SettingsStore;
}

@freezed
sealed class ThemeSettings with _$ThemeSettings {
  const factory ThemeSettings({
    required Brightness platformBrightness,
    required ThemeMode themeMode,
    required Color primaryColor,
  }) = _ThemeSettings;
}
