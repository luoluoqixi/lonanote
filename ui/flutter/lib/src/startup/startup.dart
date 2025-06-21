import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';
import 'package:logger/logger.dart';
import 'package:lonanote/src/bindings/api/settings/settings.dart';
import 'package:lonanote/src/bindings/bindings.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/rust/frb_generated.dart';
import 'startup_app.dart';

Future<void> started() async {
  // 屏幕刷新率优化
  // 设置这个会导致ios上第一次滚动时报错
  // GestureBinding.instance.resamplingEnabled = true;
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
    await Bindings.init();
    logger.i("Bindings.init finish");
  } catch (e) {
    logger.e("Bindings.init error: $e");
    rethrow;
  }

  await RustSettings.initSettings();
}

Future<void> loadEnv() async {
  if (AppConfig.isDebug) {
    // priority: environment > .env.local > .env
    await dotenv.load(fileName: '.env.local', mergeWith: Platform.environment);
    await dotenv.load(fileName: '.env', mergeWith: {...dotenv.env});
  } else {
    // priority: environment > .env
    await dotenv.load(fileName: '.env', mergeWith: Platform.environment);
  }
}

Future<void> startup() async {
  if (AppConfig.isDebug) {
    Logger.level = Level.debug;
  } else {
    Logger.level = Level.info;
  }

  final startTime = DateTime.now().millisecondsSinceEpoch;

  await loadEnv();

  WidgetsFlutterBinding.ensureInitialized();

  await initRust();
  await startupApp();
  await started();

  int duration = DateTime.now().millisecondsSinceEpoch - startTime;
  if (AppConfig.isDebug) {
    logger.i("启动耗时: ${duration}ms");
    testBindings();
  }
}
