import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
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

  SystemUiOverlayStyle _getSystemOverlayStyle(
      ColorScheme colorScheme, bool isLight) {
    final style =
        isLight ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark;
    final iconBrightness = isLight ? Brightness.dark : Brightness.light;
    return style.copyWith(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: iconBrightness,
      statusBarIconBrightness: iconBrightness,
      statusBarBrightness: colorScheme.brightness,
      systemNavigationBarContrastEnforced: false,
      systemStatusBarContrastEnforced: false,
    );
  }

  ThemeData _getMaterialThemeData(ThemeSettings theme, bool isLight) {
    final colorScheme = isLight
        ? const ColorScheme.light().copyWith(
            primary: theme.primaryColor,
          )
        : const ColorScheme.dark().copyWith(
            primary: theme.primaryColor,
          );

    final appBarTheme = AppBarTheme(
        systemOverlayStyle: _getSystemOverlayStyle(colorScheme, isLight),
        titleSpacing: 0.0,
        elevation: 0.0,
        centerTitle: true,
        backgroundColor: colorScheme.surface,
        titleTextStyle: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: isLight ? Colors.black : Colors.white,
        ));
    final themeData = isLight ? ThemeData.light() : ThemeData.dark();
    return themeData.copyWith(
      brightness: colorScheme.brightness,
      colorScheme: colorScheme,
      appBarTheme: appBarTheme,
    );
  }

  CupertinoThemeData _getCupertinoThemeData(ThemeSettings theme, bool isLight) {
    return CupertinoThemeData(
      primaryColor: theme.primaryColor,
    );
  }

  Widget buildBody(ColorScheme colorScheme) {
    return const SafeArea(
      top: true,
      bottom: false,
      child: ColoredBox(
        color: Colors.purple,
        // color: backgroundColor,
        child: Column(
          children: [
            Expanded(
              child: Row(
                mainAxisSize: MainAxisSize.max,
                children: [
                  Index(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  PlatformAppBar? buildAppBar(ColorScheme colorScheme) {
    const title = null;
    return AppConfig.isMaterial
        ? PlatformAppBar(
            backgroundColor: Colors.transparent,
            title: title,
            material: (context, platform) => MaterialAppBarData(
              toolbarHeight: 0,
            ),
            // cupertino: (context, platform) => CupertinoNavigationBarData(
            //   border: const Border(),
            //   backgroundColor: colorScheme.surface,
            //   title: title,
            //   brightness: colorScheme.brightness,
            // ),
          )
        : null;
  }

  Widget buildHome(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = colorScheme.surface;
    return PlatformScaffold(
      appBar: buildAppBar(colorScheme),
      backgroundColor: backgroundColor,
      body: buildBody(colorScheme),
      material: (context, platform) => MaterialScaffoldData(
        extendBody: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // final botToastBuilder = BotToastInit();

    final theme = ref.watch(settingsProvider).theme;
    return PlatformProvider(
      settings: PlatformSettingsData(
        platformStyle: const PlatformStyleData(
          android: PlatformStyle.Material,
          ios: PlatformStyle.Cupertino,
        ),
      ),
      builder: (context) => PlatformTheme(
        themeMode: theme.themeMode,
        materialLightTheme: _getMaterialThemeData(theme, true),
        materialDarkTheme: _getMaterialThemeData(theme, false),
        cupertinoLightTheme: _getCupertinoThemeData(theme, true),
        cupertinoDarkTheme: _getCupertinoThemeData(theme, false),
        builder: (context) {
          final colorScheme = Theme.of(context).colorScheme;
          SystemChrome.setSystemUIOverlayStyle(_getSystemOverlayStyle(
            colorScheme,
            colorScheme.brightness == Brightness.light,
          ));
          return PlatformApp(
            debugShowCheckedModeBanner: false,
            localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
              DefaultMaterialLocalizations.delegate,
              DefaultWidgetsLocalizations.delegate,
              DefaultCupertinoLocalizations.delegate,
            ],
            title: 'home',
            home: buildHome(context),
          );
        },
      ),
    );
  }
}
