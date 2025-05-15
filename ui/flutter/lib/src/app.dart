import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/config/app_config.dart';

import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/app_theme.dart';
import 'package:lonanote/src/views/index.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> with SingleTickerProviderStateMixin {
  @override
  void initState() {
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
          final colorScheme = Theme.of(context).colorScheme;
          SystemChrome.setSystemUIOverlayStyle(AppTheme.getSystemOverlayStyle(
            colorScheme,
          ));
          return PlatformApp(
            debugShowCheckedModeBanner: false,
            localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
              DefaultMaterialLocalizations.delegate,
              DefaultWidgetsLocalizations.delegate,
              DefaultCupertinoLocalizations.delegate,
            ],
            title: AppConfig.appTitle,
            home: Index(),
          );
        },
      ),
    );
  }
}
