import 'package:lonanote/src/bindings/bindings.dart';

class App {
  static String? getVersion() {
    return Bindings.invoke(key: "app.get_version");
  }
}
