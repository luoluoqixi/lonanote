import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static final bool isDesktop =
      Platform.isWindows || Platform.isLinux || Platform.isMacOS;
  static final bool isMobile = Platform.isAndroid || Platform.isIOS;
  static final bool isMaterial =
      Platform.isWindows || Platform.isLinux || Platform.isAndroid;
  static const bool isDebug = kDebugMode;
  static const bool isRelease = kReleaseMode;
  static const bool isProfile = kProfileMode;
  static String githubUrl = dotenv.env['GITHUB_URL'] ?? "";
  static String appTitleZH = dotenv.env['APP_TITLE_ZH'] ?? "";
  static String appTitleEN = dotenv.env['APP_TITLE'] ?? "";
  static String devServerIp = dotenv.env['DEV_SERVER_IP'] ?? "";
  static String devServerPort = dotenv.env['DEV_SERVER_PORT'] ?? "";
  static String get appTitle => appTitleZH;
}
