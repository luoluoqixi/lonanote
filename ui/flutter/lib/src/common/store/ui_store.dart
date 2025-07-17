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

  static bool? getShowFloatingToolbar() {
    return Store.getSyncValue(syncKey, "show_floating_toolbar");
  }

  static void setShowFloatingToolbar(bool value) {
    Store.setSyncValue(syncKey, "show_floating_toolbar", value);
  }

  static bool? getShowLineNumberInSourceMode() {
    return Store.getSyncValue(syncKey, "show_line_number_in_source_mode");
  }

  static void setShowLineNumberInSourceMode(bool value) {
    Store.setSyncValue(syncKey, "show_line_number_in_source_mode", value);
  }

  static int? getFileSortType() {
    return Store.getSyncValue(syncKey, "file_sort_type");
  }

  static void setFileSortType(int value) {
    Store.setSyncValue(syncKey, "file_sort_type", value);
  }
}
