import 'dart:async';

import 'package:lonanote/src/common/log.dart';

import 'src/startup/startup.dart';

void main() {
  runZonedGuarded(startup, onError);
}

void onError(Object obj, StackTrace stack) {
  logger.e(obj.toString());
  logger.e(stack.toString());
}
