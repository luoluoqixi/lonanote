import 'package:flutter/material.dart';
import 'package:lonanote/src/widgets/flutter/custom_flexible_space_bar.dart';

class ScrollAppBar extends StatelessWidget {
  final String title;
  final String? subTitle;
  final Color? titleColor;
  final Color? subTitleColor;
  final Color? bgColor;
  final List<Widget>? actions;
  final double? scrolledUnderElevation;

  const ScrollAppBar({
    super.key,
    required this.title,
    this.subTitle,
    this.titleColor,
    this.subTitleColor,
    this.bgColor,
    this.actions,
    this.scrolledUnderElevation,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isLight = colorScheme.brightness == Brightness.light;
    final backgroundColor = colorScheme.surface;
    final textColor = isLight ? Colors.black : Colors.white;
    final subColor = isLight ? Colors.grey : Colors.white;
    return SliverAppBar(
      pinned: true,
      backgroundColor: backgroundColor,
      titleTextStyle: TextStyle(color: textColor),
      centerTitle: false,
      expandedHeight: 120.0,
      scrolledUnderElevation: scrolledUnderElevation ?? 1,
      surfaceTintColor: colorScheme.primary,
      flexibleSpace: CustomFlexibleSpaceBar(
        centerTitle: false,
        expandedTitleScale: 2,
        fixedSubtitle: subTitle != null
            ? Text(
                subTitle ?? "",
                style: TextStyle(
                  color: subTitleColor ?? subColor,
                  fontSize: 12,
                ),
              )
            : null,
        title: Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 16,
              color: titleColor ?? textColor,
            ),
          ),
        ),
        titlePadding: const EdgeInsets.only(left: 20, bottom: 10),
        collapseMode: CollapseMode.parallax,
      ),
      elevation: 0,
      actions: actions,
    );
  }
}
