import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';

import '../../bindings.dart';
import 'types.dart';

class RustSettings {
  static RustSettingsData? settings;

  static Future<void> initSettings() async {
    await getSettings();
  }

  static Future<RustSettingsData> getSettings() async {
    final res = await Bindings.invokeAsync(key: "settings.get_settings");
    final s = RustSettingsData.fromJson(res as Map<String, dynamic>);
    settings = s;
    return s;
  }

  static Future<void> setSettings(RustSettingsData settings) async {
    await Bindings.invokeAsync(
        key: "settings.set_settings", value: settings.toJson());
  }

  static Future<void> setSettingsAndSave(RustSettingsData settings) async {
    await Bindings.invokeAsync(
        key: "settings.set_settings_and_save", value: settings.toJson());
  }

  static Future<void> saveSettings() async {
    await Bindings.invokeAsync(key: "settings.save_settings");
  }

  static Future<void> resetSettingsAutoSaveInterval() async {
    await Bindings.invokeAsync(
        key: "settings.reset_settings_auto_save_interval");
  }

  static Future<void> test() async {
    if (!AppConfig.isDebug) return;

    var settings = await getSettings();
    logger.i("RustSettings.getSettings = ${settings.toJson().toString()}");

    settings.autoSaveInterval = 3.0;
    await setSettingsAndSave(settings);
    settings = await getSettings();
    logger.i("RustSettings.setSettingsAndSave = ${settings.autoSaveInterval}");

    resetSettingsAutoSaveInterval();
    settings = await getSettings();
    logger.i(
        "RustSettings.resetSettingsAutoSaveInterval = ${settings.autoSaveInterval}");

    saveSettings();
    settings = await getSettings();
    logger.i("RustSettings.saveSettings = ${settings.autoSaveInterval}");
  }
}
