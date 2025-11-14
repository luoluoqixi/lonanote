import 'dart:convert';

import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Store {
  static SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();

  static Future<Set<String>> getKeys() async {
    return asyncPrefs.getKeys();
  }

  static Future<void> clear() async {
    await asyncPrefs.clear();
  }

  static Future<void> remove(String key) async {
    await asyncPrefs.remove(key);
  }

  static Future<void> setString(String key, String value) async {
    await asyncPrefs.setString(key, value);
  }

  static Future<String?> getString(String key) async {
    return await asyncPrefs.getString(key);
  }

  static Future<void> setBool(String key, bool value) async {
    await asyncPrefs.setBool(key, value);
  }

  static Future<bool?> getBool(String key) async {
    return await asyncPrefs.getBool(key);
  }

  static Future<void> setDouble(String key, double value) async {
    await asyncPrefs.setDouble(key, value);
  }

  static Future<double?> getDouble(String key) async {
    return await asyncPrefs.getDouble(key);
  }

  static Future<void> setInt(String key, int value) async {
    await asyncPrefs.setInt(key, value);
  }

  static Future<int?> getInt(String key) async {
    return await asyncPrefs.getInt(key);
  }

  static Future<void> setStringList(String key, List<String> value) async {
    await asyncPrefs.setStringList(key, value);
  }

  static Future<List<String>?> getStringList(String key) async {
    return await asyncPrefs.getStringList(key);
  }

  static Map<String, dynamic>? getSyncData(String key) {
    final dataDir = RustPath.getDataDir();
    final filePath = "$dataDir/$key.json";
    if (RustFs.exists(filePath)) {
      final jsonStr = RustFs.readToString(filePath);
      try {
        final data = jsonDecode(jsonStr);
        if (data != null) {
          return data as Map<String, dynamic>;
        }
      } catch (e) {
        logger.e("store json parse error: $key.json, error: $e");
      }
    }
    return null;
  }

  static void setSyncData(String key, Map<String, dynamic> value) {
    final dataDir = RustPath.getDataDir();
    final filePath = "$dataDir/$key.json";
    if (!RustFs.exists(dataDir)) {
      RustFs.createDirAll(dataDir);
    }
    final json = jsonEncode(value);
    RustFs.write(filePath, json);
  }

  static T? getSyncValue<T>(String dataKey, String key) {
    final data = getSyncData(dataKey);
    if (data == null) return null;
    return data[key];
  }

  static void setSyncValue(String dataKey, String key, dynamic value) {
    var data = getSyncData(dataKey);
    data ??= <String, dynamic>{};
    data[key] = value;
    setSyncData(dataKey, data);
  }
}
