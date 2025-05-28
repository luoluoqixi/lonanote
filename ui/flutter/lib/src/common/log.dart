import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';
import 'package:logger/logger.dart';

final logger = Logger();

class LoggerUtility {
  static String errorShow(String message, Object e) {
    if (e is AnyhowException) {
      var s = e.message
          .replaceFirst(RegExp(r'Stack backtrace:.*', dotAll: true), '')
          .trim();
      if (s.startsWith("[workspace] notfound path:")) {
        s = "路径不存在: ${s.substring("[workspace] notfound path:".length)}";
      }
      return "$message: $s";
    }
    return "$message: $e";
  }
}
