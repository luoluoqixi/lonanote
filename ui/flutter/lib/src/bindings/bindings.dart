import 'dart:async';
import 'dart:convert';

import 'package:lonanote/src/rust/api/command.dart' as command;

class Bindings {
  static bool isInited = false;

  static init() {
    if (isInited) return;
    final error = command.init();
    if (error != null) {
      throw Exception(error);
    }
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
      {required String key, String? value}) async {
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

  static regDartFunction(
      {required String key,
      required FutureOr<String?> Function(String?) callback}) {
    command.regDartFunction(key: key, callback: callback);
  }

  static unregDartFunction({required String key}) {
    command.unregDartFunction(key: key);
  }

  static clearDartFunction() {
    command.clearDartFunction();
  }

  static List<String> getCommandDartKeys() {
    return command.getCommandDartKeys();
  }

  static BigInt getCommandDartLen() {
    return command.getCommandDartLen();
  }
}
