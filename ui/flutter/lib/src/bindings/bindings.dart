import 'dart:async';
import 'dart:convert';

import 'package:lonanote/src/bindings/api/path/path.dart';
import 'package:lonanote/src/rust/api/command.dart' as command;

class Bindings {
  static bool isInited = false;

  static Future<void> _initApi() async {
    await RustPath.initPath();
  }

  static Future<void> init() async {
    if (isInited) return;
    final error = command.init();
    if (error != null) {
      throw Exception(error);
    }
    await _initApi();
    isInited = true;
  }

  static dynamic invoke({required String key, Object? value}) {
    var args = jsonEncode(value);
    var ret = command.invoke(key: key, args: args);
    if (ret == null) {
      return null;
    }
    return jsonDecode(ret);
  }

  static Future<dynamic> invokeAsync(
      {required String key, Object? value}) async {
    var args = jsonEncode(value);
    var ret = await command.invokeAsync(key: key, args: args);
    if (ret == null) {
      return null;
    }
    return jsonDecode(ret);
  }

  static BigInt getCommandLen() {
    return command.getCommandLen();
  }

  static BigInt getCommandAsyncLen() {
    return command.getCommandAsyncLen();
  }

  static List<String> getCommandKeys() {
    return command.getCommandKeys();
  }

  static List<String> getCommandAsyncKeys() {
    return command.getCommandAsyncKeys();
  }

  static void regDartFunction(
      {required String key,
      required FutureOr<String?> Function(String?) callback}) {
    command.regDartFunction(key: key, callback: callback);
  }

  static void unregDartFunction({required String key}) {
    command.unregDartFunction(key: key);
  }

  static void clearDartFunction() {
    command.clearDartFunction();
  }

  static List<String> getCommandDartKeys() {
    return command.getCommandDartKeys();
  }

  static BigInt getCommandDartLen() {
    return command.getCommandDartLen();
  }
}

void testBindings() {
  // RustApp.test();
  // RustFs.test();
  // RustPath.test();
  // RustSettings.test();
  // RustWorkspace.test();
  // RustWorkspaceManager.test();
}
