import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/startup/startup.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async => {await initRust()});
  test("rust api > path", () async {
    await RustWorkspace.test();
    await RustWorkspaceManager.test();
  });
}
