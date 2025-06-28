import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';
import 'package:logger/logger.dart';
import 'package:lonanote/src/bindings/api/settings/settings.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
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

  try {
    logger.i("RustSettings.initSettings start...");
    await RustSettings.initSettings();
    logger.i("RustSettings.initSettings finish");
  } catch (e) {
    logger.e("RustSettings.initSettings error: $e");
    rethrow;
  }

  try {
    logger.i("RustWorkspaceManager.initSetup start...");
    await RustWorkspaceManager.initSetup("Default");
    logger.i("RustWorkspaceManager.initSetup finish");
  } catch (e) {
    logger.e("RustWorkspaceManager.initSetup error: $e");
    rethrow;
  }
}

Future<void> loadEnv() async {
  if (AppConfig.isDebug) {
    Future<bool> assetExists(String assetPath) async {
      try {
        await rootBundle.loadString(assetPath);
        return true;
      } catch (e) {
        return false;
      }
    }

    logger.i("loading environment variables...");
    // priority: environment > .env.local > .env
    if (await assetExists("env/.env.local")) {
      logger.i("loading .env.local");
      await dotenv.load(
          fileName: 'env/.env.local', mergeWith: Platform.environment);
      await dotenv.load(fileName: 'env/.env', mergeWith: {...dotenv.env});
    } else {
      logger.i("loading .env");
      await dotenv.load(fileName: 'env/.env', mergeWith: Platform.environment);
    }
  } else {
    logger.i("loading .env");
    // priority: environment > .env
    await dotenv.load(fileName: 'env/.env', mergeWith: Platform.environment);
  }
}

Future<void> startup() async {
  if (AppConfig.isDebug) {
    Logger.level = Level.debug;
  } else {
    Logger.level = Level.info;
  }

  final startTime = DateTime.now().millisecondsSinceEpoch;

  WidgetsFlutterBinding.ensureInitialized();

  await loadEnv();
  await initRust();
  await startupApp();
  await started();

  int duration = DateTime.now().millisecondsSinceEpoch - startTime;
  if (AppConfig.isDebug) {
    logger.i("启动耗时: ${duration}ms");
    testBindings();
  }
}
