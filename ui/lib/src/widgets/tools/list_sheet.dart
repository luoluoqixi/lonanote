import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_list_grid.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class ListSheetItem extends PlatformListGridItem {
  ListSheetItem({
    required super.value,
    required super.title,
    super.getIcon,
    super.icon,
  });
}

class ListSheet extends StatelessWidget {
  final void Function(int value) onChange;
  final List<ListSheetItem> items;
  final String? title;
  final double? desiredHeight;
  final bool? galleryMode;
  final int? galleryRowCount;
  final double? galleryCrossAxisSpacing;
  final double? galleryMainAxisSpacing;
  final BorderRadius? galleryBorderRadius;

  final EdgeInsetsGeometry? padding;
  final double? iconSize;

  final Color? tileBgColor;
  final Color? tileTextColor;

  const ListSheet({
    super.key,
    required this.onChange,
    required this.items,
    this.title,
    this.desiredHeight,
    this.galleryMode,
    this.galleryRowCount,
    this.galleryCrossAxisSpacing,
    this.galleryMainAxisSpacing,
    this.galleryBorderRadius,
    this.padding,
    this.iconSize,
    this.tileBgColor,
    this.tileTextColor,
  });
  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformSheetPage(
      titleText: title ?? "列表",
      contentPadding: EdgeInsets.zero,
      desiredHeight: desiredHeight ?? 400,
      allowScroll: true,
      titleBgColor: ThemeColors.getBgColor(colorScheme),
      contentBgColor: ThemeColors.getBg1Color(colorScheme),
      children: [
        PlatformListGrid(
          onChange: onChange,
          items: items,
          galleryMode: galleryMode,
          galleryRowCount: galleryRowCount,
          galleryCrossAxisSpacing: galleryCrossAxisSpacing,
          galleryMainAxisSpacing: galleryMainAxisSpacing,
          padding: padding,
          iconSize: iconSize,
          tileBgColor: tileBgColor,
          tileTextColor: tileTextColor,
          galleryBorderRadius: galleryBorderRadius,
        ),
      ],
    );
  }
}
