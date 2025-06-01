import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/settings/settings.dart';
import 'package:lonanote/src/bindings/api/settings/types.dart';
import 'package:lonanote/src/providers/settings/settings.dart';

class SettingsController {
  static Future<void> refreshSettings(WidgetRef ref) async {
    final s = ref.read(settingsProvider.notifier);
    await s.updateSettings();
  }

  static Future<void> setSettingsValue(
    WidgetRef ref,
    Function(RustSettingsData settings) setValue, {
    bool isRefresh = true,
  }) async {
    final settings = await RustSettings.getSettings();
    setValue(settings);
    await RustSettings.setSettingsAndSave(settings);
    if (isRefresh) {
      await refreshSettings(ref);
    }
  }

  static Future<void> setAutoOpenLastWorkspace(
    WidgetRef ref,
    bool value,
  ) async {
    setSettingsValue(ref, (s) => s.autoOpenLastWorkspace = value);
  }

  static Future<void> setAutoCheckUpdate(
    WidgetRef ref,
    bool value,
  ) async {
    setSettingsValue(ref, (s) => s.autoCheckUpdate = value);
  }

  static Future<void> setAutoSave(
    WidgetRef ref,
    bool value,
  ) async {
    setSettingsValue(ref, (s) => s.autoSave = value);
  }

  static Future<void> setAutoSaveInterval(
    WidgetRef ref,
    double value,
  ) async {
    setSettingsValue(ref, (s) => s.autoSaveInterval = value);
  }

  static Future<void> setAutoSaveFocusChange(
    WidgetRef ref,
    bool value,
  ) async {
    setSettingsValue(ref, (s) => s.autoSaveFocusChange = value);
  }

  static Future<void> resetSettingsAutoSaveInterval(
    WidgetRef ref,
    bool value,
  ) async {
    await RustSettings.resetSettingsAutoSaveInterval();
    await refreshSettings(ref);
  }
}
