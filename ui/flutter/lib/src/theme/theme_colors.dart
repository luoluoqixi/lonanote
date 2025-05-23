import 'package:flutter/material.dart';

class ThemeColors {
  static Color lightPressBgColor =
      Color.from(alpha: 1, red: 0.7, green: 0.7, blue: 0.7);
  static Color darkPressBgColor =
      Color.from(alpha: 1, red: 0.3, green: 0.3, blue: 0.3);

  static bool isLight(ColorScheme colorScheme) {
    return colorScheme.brightness == Brightness.light;
  }

  static Color getBgColor(ColorScheme colorScheme) {
    return colorScheme.surface;
  }

  static Color getPressBgColor(ColorScheme colorScheme) {
    return isLight(colorScheme) ? lightPressBgColor : darkPressBgColor;
  }

  static Color getTextColor(ColorScheme colorScheme) {
    return isLight(colorScheme) ? Colors.black : Colors.white;
  }

  static Color getTextColorReverse(ColorScheme colorScheme) {
    return isLight(colorScheme) ? Colors.white : Colors.black;
  }

  static Color getTextGreyColor(ColorScheme colorScheme) {
    return isLight(colorScheme) ? Colors.black54 : Colors.grey;
  }
}
