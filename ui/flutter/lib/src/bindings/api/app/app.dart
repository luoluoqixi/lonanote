import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';

import '../../bindings.dart';

class RustApp {
  static String? getVersion() {
    return Bindings.invoke(key: "app.get_version");
  }

  static void test() {
    if (!AppConfig.isDebug) return;

    logger.i("RustApp.getVersion = ${getVersion()}");
  }
}
