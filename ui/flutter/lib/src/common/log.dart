import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';
import 'package:logger/logger.dart';

final logger = Logger();

class LoggerUtility {
  static String errorShow(String message, Object e) {
    if (e is AnyhowException) {
      final s = e.message.replaceFirst(RegExp(r'Stack backtrace:.*', dotAll: true), '').trim();
      return "$message: $s";
    }
    return "$message: $e";
  }
}
