import './store.dart';

class UIStore {
  static String syncKey = "ui_settings";

  static Future<void> setSortType(int sortType) async {
    await Store.setInt('sort_type', sortType);
  }

  static Future<int?> getSortType() async {
    return await Store.getInt('sort_type');
  }

  static int? getThemeMode() {
    return Store.getSyncValue(syncKey, "theme_mode");
  }

  static void setThemeMode(int value) {
    Store.setSyncValue(syncKey, "theme_mode", value);
  }

  static String? getThemePrimaryColor() {
    return Store.getSyncValue(syncKey, "theme_primary_color");
  }

  static void setThemePrimaryColor(String value) {
    Store.setSyncValue(syncKey, "theme_primary_color", value);
  }
}
