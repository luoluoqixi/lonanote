import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lonanote/src/providers/settings/settings.dart';

class AppTheme {
  static SystemUiOverlayStyle getSystemOverlayStyle(ColorScheme colorScheme) {
    final isLight = colorScheme.brightness == Brightness.light;
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

  static ThemeData getMaterialThemeData(
      ThemeSettings theme, Brightness brightness) {
    final isLight = brightness == Brightness.light;
    final colorScheme = isLight
        ? const ColorScheme.light().copyWith(
            primary: theme.primaryColor,
          )
        : const ColorScheme.dark().copyWith(
            primary: theme.primaryColor,
          );

    final appBarTheme = AppBarTheme(
        systemOverlayStyle: getSystemOverlayStyle(colorScheme),
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

  static CupertinoThemeData getCupertinoThemeData(
      ThemeSettings theme, Brightness brightness) {
    final isLight = brightness == Brightness.light;
    final colorScheme = isLight
        ? const ColorScheme.light().copyWith(
            primary: theme.primaryColor,
          )
        : const ColorScheme.dark().copyWith(
            primary: theme.primaryColor,
          );
    return CupertinoThemeData(
      primaryColor: theme.primaryColor, // 导航栏按钮颜色
      barBackgroundColor: colorScheme.surface, // 导航栏背景色
      textTheme: CupertinoTextThemeData(
        navTitleTextStyle: TextStyle(
          // 导航栏标题样式
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: isLight ? Colors.black : Colors.white,
        ),
      ),
    );
  }
}
