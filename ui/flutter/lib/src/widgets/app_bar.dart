import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/flutter/custom_flexible_space_bar.dart';

class ScrollAppBar extends StatelessWidget {
  static double defaultExpandedHeight = 120.0;
  final String title;
  final double? titleFontSize;
  final String? subTitle;
  final double? subTitleFontSize;
  final Color? titleColor;
  final Color? subTitleColor;
  final Color? bgColor;
  final List<Widget>? actions;
  final double? scrolledUnderElevation;
  final double? expandedHeight;
  final double? expandedTitleScale;
  final Widget? flexibleSpace;

  const ScrollAppBar({
    super.key,
    required this.title,
    this.titleFontSize,
    this.subTitle,
    this.subTitleFontSize,
    this.titleColor,
    this.subTitleColor,
    this.bgColor,
    this.actions,
    this.scrolledUnderElevation,
    this.expandedHeight,
    this.expandedTitleScale,
    this.flexibleSpace,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = bgColor ?? ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);
    final subColor = ThemeColors.getTextGreyColor(colorScheme);
    return SliverAppBar(
      pinned: true,
      backgroundColor: backgroundColor,
      titleTextStyle: TextStyle(color: textColor),
      centerTitle: false,
      expandedHeight: expandedHeight ?? defaultExpandedHeight,
      scrolledUnderElevation: scrolledUnderElevation ?? 1,
      surfaceTintColor: colorScheme.primary,
      flexibleSpace: flexibleSpace ??
          CustomFlexibleSpaceBar(
            centerTitle: false,
            expandedTitleScale: expandedTitleScale ?? 2,
            fixedSubtitle: subTitle != null
                ? Text(
                    subTitle ?? "",
                    style: TextStyle(
                      color: subTitleColor ?? subColor,
                      fontSize: subTitleFontSize ?? 12,
                    ),
                  )
                : null,
            title: Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Text(
                title,
                style: TextStyle(
                  fontSize: titleFontSize ?? (subTitle == null ? 20 : 18),
                  color: titleColor ?? textColor,
                ),
              ),
            ),
            titlePadding: const EdgeInsets.only(left: 20, bottom: 10),
            collapseMode: CollapseMode.parallax,
          ),
      elevation: 0,
      actions: [
        ...?actions,
      ],
    );
  }
}

class SimpleAppBar extends StatelessWidget {
  static double defaultHeight = kToolbarHeight;
  final Widget? title;
  final String? titleText;
  final double? titleFontSize;
  final Color? titleColor;
  final Color? bgColor;
  final List<Widget>? actions;
  final double? scrolledUnderElevation;
  final double? expandedHeight;
  final double? expandedTitleScale;

  const SimpleAppBar({
    super.key,
    required this.title,
    this.titleText,
    this.titleFontSize,
    this.titleColor,
    this.bgColor,
    this.actions,
    this.scrolledUnderElevation,
    this.expandedHeight,
    this.expandedTitleScale,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = bgColor ?? ThemeColors.getBgColor(colorScheme);
    final textColor = titleColor ?? ThemeColors.getTextColor(colorScheme);
    return SliverAppBar(
      pinned: true,
      backgroundColor: backgroundColor,
      titleTextStyle:
          TextStyle(color: textColor, fontSize: titleFontSize ?? 22),
      title: title ?? Text(titleText ?? ""),
      centerTitle: false,
      expandedHeight: 0,
      scrolledUnderElevation: scrolledUnderElevation ?? 1,
      surfaceTintColor: colorScheme.primary,
      elevation: 0,
      actions: [
        ...?actions,
      ],
    );
  }
}
