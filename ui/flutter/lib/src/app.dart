import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/localizations/zh.dart';

import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/router/router.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/app_theme.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/views/index.dart';
import 'package:pull_down_button/pull_down_button.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> with SingleTickerProviderStateMixin {
  @override
  void initState() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    // final botToastBuilder = BotToastInit();

    final theme = ref.watch(settingsProvider.select((s) => s.theme));
    logger.i("theme mode: ${theme.themeMode}");
    return PlatformProvider(
      settings: PlatformSettingsData(
        platformStyle: const PlatformStyleData(
          android: PlatformStyle.Material,
          ios: PlatformStyle.Cupertino,
          macos: PlatformStyle.Cupertino,
          windows: PlatformStyle.Material,
          linux: PlatformStyle.Material,
        ),
      ),
      builder: (context) => PlatformTheme(
        themeMode: theme.themeMode,
        materialLightTheme:
            AppTheme.getMaterialThemeData(theme, Brightness.light),
        materialDarkTheme:
            AppTheme.getMaterialThemeData(theme, Brightness.dark),
        cupertinoLightTheme:
            AppTheme.getCupertinoThemeData(theme, Brightness.light),
        cupertinoDarkTheme:
            AppTheme.getCupertinoThemeData(theme, Brightness.dark),
        builder: (context) {
          final colorScheme = ThemeColors.getColorScheme(context);
          SystemChrome.setSystemUIOverlayStyle(AppTheme.getSystemOverlayStyle(
            colorScheme,
          ));
          return SafeArea(
            left: false,
            top: false,
            bottom: false,
            right: false,
            child: PlatformApp(
              debugShowCheckedModeBanner: false,
              localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
                DefaultMaterialLocalizations.delegate,
                DefaultWidgetsLocalizations.delegate,
                DefaultCupertinoLocalizations.delegate,
                ZHMaterialLocalizations.delegate,
                ZHWidgetsLocalizations.delegate,
                ZHCupertinoLocalizations.delegate,
              ],
              supportedLocales: const <Locale>[
                Locale('zh', 'CN'),
                Locale('en', 'US'),
              ],
              navigatorObservers: [
                RouterNavigatorObserver(ref),
                AppRouter.routeObserver,
              ],
              title: AppConfig.appTitle,
              home: Index(),
              cupertino: (context, platform) => CupertinoAppData(
                builder: (context, child) => PullDownButtonInheritedTheme(
                  data: AppTheme.getPullDownTheme(colorScheme),
                  child: child!,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
