library;

// export 'src/rust/api/simple.dart';
// export 'src/rust/frb_generated.dart' show RustLib;

import 'package:logger/logger.dart';

import 'src/rust/frb_generated.dart' show RustLib;

import 'src/bindings/bindings.dart';
import 'src/bindings/api/settings/settings.dart';
import 'src/bindings/api/workspace/workspace_manager.dart';

export 'src/bindings/api/app/app.dart';
export 'src/bindings/api/fs/fs.dart';
export 'src/bindings/api/path/path.dart';
export 'src/bindings/api/settings/settings.dart';
export 'src/bindings/api/settings/types.dart';
export 'src/bindings/api/workspace/workspace.dart';
export 'src/bindings/api/workspace/workspace_manager.dart';
export 'src/bindings/api/workspace/types.dart';

class LonaNoteFlutterCore {
  static Logger? _logger;

  static void logInfo(String message) {
    if (_logger == null) {
      // ignore: avoid_print
      print(message);
    } else {
      _logger?.i(message);
    }
  }

  static void logError(String message) {
    if (_logger == null) {
      // ignore: avoid_print
      print(message);
    } else {
      _logger?.e(message);
    }
  }

  static void logWarning(String message) {
    if (_logger == null) {
      // ignore: avoid_print
      print(message);
    } else {
      _logger?.w(message);
    }
  }

  static Future<void> initialize({
    Logger? logger,
    String? dataDir,
    String? cacheDir,
    String? downloadDir,
    String? homeDir,
    String? rootDir,
    String initSetup = "Default",
  }) async {
    _logger = logger;

    try {
      logInfo("RustLib.init start...");
      // var config = const ExternalLibraryLoaderConfig(
      //   stem: 'lonanote_flutter_core',
      //   ioDirectory: '../../rust/target/release/',
      //   webPrefix: 'pkg/',
      // );
      // await RustLib.init(externalLibrary: await loadExternalLibrary(config));
      await RustLib.init();
      logInfo("RustLib.init finish");
    } catch (e) {
      logError("RustLib.init error: $e");
      rethrow;
    }
    try {
      logInfo("Bindings.init start...");
      await Bindings.init(
        dataDir: dataDir,
        cacheDir: cacheDir,
        downloadDir: downloadDir,
        homeDir: homeDir,
        rootDir: rootDir,
      );
      logInfo("Bindings.init finish");
    } catch (e) {
      logError("Bindings.init error: $e");
      rethrow;
    }

    try {
      logInfo("RustSettings.initSettings start...");
      await RustSettings.initSettings();
      logInfo("RustSettings.initSettings finish");
    } catch (e) {
      logError("RustSettings.initSettings error: $e");
      rethrow;
    }

    try {
      logInfo("RustWorkspaceManager.initSetup start...");
      await RustWorkspaceManager.initSetup(initSetup);
      logInfo("RustWorkspaceManager.initSetup finish");
    } catch (e) {
      logError("RustWorkspaceManager.initSetup error: $e");
      rethrow;
    }
  }
}
