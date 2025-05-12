import 'dart:io';

import 'package:flutter/foundation.dart';

class AppConfig {
  static final bool isDesktop =
      Platform.isWindows || Platform.isLinux || Platform.isMacOS;
  static final bool isMaterial =
      Platform.isWindows || Platform.isLinux || Platform.isAndroid;
  static const bool isDebug = kDebugMode;
  static const bool isRelease = kReleaseMode;
  static const bool isProfile = kProfileMode;
}
