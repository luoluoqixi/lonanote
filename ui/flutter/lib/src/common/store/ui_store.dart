import './store.dart';

class UIStore {
  static Future<void> setSortType(int sortType) async {
    await Store.setInt('sort_type', sortType);
  }

  static Future<int?> getSortType() async {
    return await Store.getInt('sort_type');
  }
}
