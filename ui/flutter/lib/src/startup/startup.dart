import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';
import 'package:logger/logger.dart';
import 'package:lonanote/src/bindings/bindings.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/rust/frb_generated.dart';
import 'startup_app.dart';

Future<void> started() async {
  // 屏幕刷新率优化
  GestureBinding.instance.resamplingEnabled = true;
}

Future<void> initRust() async {
  try {
    logger.i("RustLib.init start...");
    var config = const ExternalLibraryLoaderConfig(
      stem: 'lonanote_app',
      ioDirectory: '../../rust/target/release/',
      webPrefix: 'pkg/',
    );
    await RustLib.init(externalLibrary: await loadExternalLibrary(config));
    logger.i("RustLib.init finish");
  } catch (e) {
    logger.e("RustLib.init error: $e");
    rethrow;
  }
  try {
    logger.i("Bindings.init start...");
    Bindings.init();
    logger.i("Bindings.init finish");
  } catch (e) {
    logger.e("Bindings.init error: $e");
    rethrow;
  }
}

Future<void> startup() async {
  if (AppConfig.isDebug) {
    Logger.level = Level.debug;
  } else {
    Logger.level = Level.info;
  }

  final startTime = DateTime.now().millisecondsSinceEpoch;

  initRust();

  WidgetsFlutterBinding.ensureInitialized();
  await startupApp();
  await started();

  int duration = DateTime.now().millisecondsSinceEpoch - startTime;
  if (AppConfig.isDebug) {
    logger.i("启动耗时: ${duration}ms");
  }
}
