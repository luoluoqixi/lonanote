import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SearchSheet extends StatelessWidget {
  const SearchSheet({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformSheetPage(
      titleText: "搜索",
      contentPadding: EdgeInsets.zero,
      childSize: 0.8,
      allowScroll: false,
      contentBgColor: ThemeColors.getBg1Color(colorScheme),
      children: [],
    );
  }
}
