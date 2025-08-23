import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';

class PlatformListGridItem {
  final int value;
  final String title;
  final Widget? Function(BuildContext context)? getIcon;
  final IconData? icon;

  const PlatformListGridItem({
    required this.value,
    required this.title,
    this.getIcon,
    this.icon,
  });
}

class PlatformListGrid extends StatelessWidget {
  final void Function(int value) onChange;
  final List<PlatformListGridItem> items;
  final double? desiredHeight;

  final bool? galleryMode;
  final int? galleryRowCount;
  final double? galleryCrossAxisSpacing;
  final double? galleryMainAxisSpacing;
  final Color? galleryBgColor;
  final BorderRadius? galleryBorderRadius;

  final EdgeInsetsGeometry? padding;
  final double? iconSize;

  final Color? tileBgColor;
  final Color? tileBgPressColor;
  final Color? tileTextColor;

  const PlatformListGrid({
    super.key,
    required this.onChange,
    required this.items,
    this.desiredHeight,
    this.galleryMode,
    this.galleryRowCount,
    this.galleryCrossAxisSpacing,
    this.galleryMainAxisSpacing,
    this.galleryBgColor,
    this.galleryBorderRadius,
    this.padding,
    this.iconSize,
    this.tileBgColor,
    this.tileBgPressColor,
    this.tileTextColor,
  });

  Widget _buildListItem(
    BuildContext context,
    PlatformListGridItem item,
  ) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor = tileTextColor ?? ThemeColors.getTextColor(colorScheme);
    final iconColor = tileTextColor ?? ThemeColors.getTextColor(colorScheme);

    final iconWidget = item.icon != null
        ? Icon(item.icon, size: iconSize ?? 20, color: iconColor)
        : item.getIcon?.call(context);

    return PlatformInkWell(
      onTap: () => onChange(item.value),
      bgColor: tileBgColor,
      pressBgColor: tileBgPressColor,
      child: Padding(
        padding:
            padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (iconWidget != null) iconWidget,
            if (iconWidget != null) const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.title,
                style: TextStyle(
                  fontSize: 16,
                  color: textColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return galleryMode == true
        ? GridView.count(
            shrinkWrap: true,
            padding: padding ?? const EdgeInsets.all(12),
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: galleryRowCount ?? 3,
            crossAxisSpacing: galleryCrossAxisSpacing ?? 12,
            mainAxisSpacing: galleryMainAxisSpacing ?? 12,
            childAspectRatio: 1.0,
            children: items
                .map((item) => _PlatformListGridGalleryItem(
                      item: item,
                      onChange: onChange,
                      tileBgColor: tileBgColor,
                      tileTextColor: tileTextColor,
                      iconSize: iconSize,
                      borderRadius: galleryBorderRadius,
                    ))
                .toList(),
          )
        : Column(
            children:
                items.map((item) => _buildListItem(context, item)).toList(),
          );
  }
}

class _PlatformListGridGalleryItem extends StatefulWidget {
  final PlatformListGridItem item;
  final void Function(int value) onChange;
  final Color? tileBgColor;
  final Color? tileTextColor;
  final double? iconSize;
  final BorderRadius? borderRadius;

  const _PlatformListGridGalleryItem({
    required this.item,
    required this.onChange,
    this.tileBgColor,
    this.tileTextColor,
    this.iconSize,
    this.borderRadius,
  });

  @override
  State<_PlatformListGridGalleryItem> createState() =>
      _PlatformListGridGalleryItemState();
}

class _PlatformListGridGalleryItemState
    extends State<_PlatformListGridGalleryItem> {
  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor =
        widget.tileTextColor ?? ThemeColors.getTextColor(colorScheme);
    final iconColor =
        widget.tileTextColor ?? ThemeColors.getTextColor(colorScheme);

    final iconWidget = widget.item.icon != null
        ? Icon(widget.item.icon, size: widget.iconSize ?? 24, color: iconColor)
        : widget.item.getIcon?.call(context);
    final border = widget.borderRadius ?? BorderRadius.circular(22.0);

    return ClipRRect(
      borderRadius: border,
      child: PlatformInkWell(
        onTap: () => widget.onChange(widget.item.value),
        child: Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: widget.tileBgColor ??
                ThemeColors.getPrimaryColor(colorScheme).withAlpha(100),
            borderRadius: border,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (iconWidget != null) ...[
                iconWidget,
                const SizedBox(height: 2),
              ],
              DefaultTextStyle(
                style: const TextStyle(),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    widget.item.title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: textColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
