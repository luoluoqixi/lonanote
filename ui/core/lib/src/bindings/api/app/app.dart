import 'package:flutter/foundation.dart';

import '../../bindings.dart';

class RustApp {
  static String? getVersion() {
    return Bindings.invoke(key: "app.get_version");
  }

  static void test() {
    if (kDebugMode) {
      print("RustApp.getVersion = ${getVersion()}");
    }
  }
}
