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
}
