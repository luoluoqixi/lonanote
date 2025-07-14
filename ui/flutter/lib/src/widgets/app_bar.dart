import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/flutter/custom_flexible_space_bar.dart';

class ScrollAppBar extends StatelessWidget {
  static double defaultExpandedHeight = 120.0;
  final Widget? title;
  final String? titleText;
  final double? titleFontSize;
  final Widget? subTitle;
  final String? subTitleText;
  final double? subTitleFontSize;
  final Color? titleColor;
  final Color? subTitleColor;
  final Color? bgColor;
  final List<Widget>? actions;
  final double? scrolledUnderElevation;
  final double? expandedHeight;
  final double? expandedTitleScale;
  final Widget? flexibleSpace;
  final bool? centerTitle;

  const ScrollAppBar({
    super.key,
    this.title,
    this.titleText,
    this.titleFontSize,
    this.subTitle,
    this.subTitleText,
    this.subTitleFontSize,
    this.titleColor,
    this.subTitleColor,
    this.bgColor,
    this.actions,
    this.scrolledUnderElevation,
    this.expandedHeight,
    this.expandedTitleScale,
    this.flexibleSpace,
    this.centerTitle,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final backgroundColor = bgColor ?? ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);
    final subColor = ThemeColors.getTextGreyColor(colorScheme);
    return SliverAppBar(
      pinned: true,
      backgroundColor: backgroundColor,
      titleTextStyle: TextStyle(color: textColor),
      centerTitle: centerTitle ?? false,
      expandedHeight: expandedHeight ?? defaultExpandedHeight,
      scrolledUnderElevation: scrolledUnderElevation ?? 1,
      surfaceTintColor: ThemeColors.getPrimaryColor(colorScheme),
      flexibleSpace: flexibleSpace ??
          CustomFlexibleSpaceBar(
            centerTitle: centerTitle ?? false,
            expandedTitleScale: expandedTitleScale ?? 2,
            fixedSubtitle: subTitle != null || subTitleText != null
                ? DefaultTextStyle(
                    style: TextStyle(
                      color: subTitleColor ?? subColor,
                      fontSize: subTitleFontSize ?? 12,
                    ),
                    child: subTitle ?? Text(subTitleText!))
                : null,
            title: Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: DefaultTextStyle(
                style: TextStyle(
                  fontSize: titleFontSize ?? (subTitle == null ? 20 : 18),
                  color: titleColor ?? textColor,
                ),
                child: title ??
                    Text(
                      titleText ?? "",
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
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
      actionsPadding: const EdgeInsets.only(right: 15.0),
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
  final bool? centerTitle;

  const SimpleAppBar({
    super.key,
    this.title,
    this.titleText,
    this.titleFontSize,
    this.titleColor,
    this.bgColor,
    this.actions,
    this.scrolledUnderElevation,
    this.expandedHeight,
    this.expandedTitleScale,
    this.centerTitle,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final backgroundColor = bgColor ?? ThemeColors.getBgColor(colorScheme);
    final textColor = titleColor ?? ThemeColors.getTextColor(colorScheme);
    return SliverAppBar(
      pinned: true,
      backgroundColor: backgroundColor,
      titleTextStyle:
          TextStyle(color: textColor, fontSize: titleFontSize ?? 22),
      title: title ??
          Text(
            titleText ?? "",
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
      centerTitle: centerTitle ?? false,
      expandedHeight: 0,
      scrolledUnderElevation: scrolledUnderElevation ?? 1,
      surfaceTintColor: ThemeColors.getPrimaryColor(colorScheme),
      elevation: 0,
      actions: [
        ...?actions,
      ],
      actionsPadding: const EdgeInsets.only(right: 15.0),
    );
  }
}
