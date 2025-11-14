import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/startup/startup.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async => {await initRust()});
  test("rust api > path", () {
    RustPath.test();
  });
}
