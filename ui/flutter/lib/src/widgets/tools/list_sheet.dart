import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class ListSheetItem {
  final int value;
  final String title;
  final Widget? Function(BuildContext context)? getIcon;
  final IconData? icon;

  const ListSheetItem({
    required this.value,
    required this.title,
    this.getIcon,
    this.icon,
  });
}

class ListSheet extends StatelessWidget {
  final void Function(int value) onChange;
  final List<ListSheetItem> items;
  final String? title;
  final double? desiredHeight;
  final bool? galleryMode;
  final int? galleryRowCount;

  final Color? tileBgColor;
  final Color? tileBgPressColor;
  final Color? tileTextColor;

  const ListSheet({
    super.key,
    required this.onChange,
    required this.items,
    this.title,
    this.desiredHeight,
    this.galleryMode,
    this.galleryRowCount,
    this.tileBgColor,
    this.tileBgPressColor,
    this.tileTextColor,
  });

  Widget _buildListItem(
    BuildContext context,
    ListSheetItem item,
  ) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor = tileTextColor ?? ThemeColors.getTextColor(colorScheme);
    final iconColor = tileTextColor ?? ThemeColors.getTextColor(colorScheme);

    final iconWidget = item.icon != null
        ? Icon(item.icon, size: 20, color: iconColor)
        : item.getIcon?.call(context);

    return PlatformInkWell(
      onTap: () => onChange(item.value),
      bgColor: tileBgColor,
      pressBgColor: tileBgPressColor,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformSheetPage(
      titleText: title ?? "列表",
      contentPadding: EdgeInsets.zero,
      desiredHeight: desiredHeight ?? 400,
      allowScroll: true,
      titleBgColor: ThemeColors.getBgColor(colorScheme),
      contentBgColor: ThemeColors.getBg1Color(colorScheme),
      children: [
        if (galleryMode == true)
          GridView.count(
            shrinkWrap: true,
            padding: const EdgeInsets.all(12),
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: galleryRowCount ?? 3,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.0,
            children: items
                .map((item) => _ListSheetGalleryItem(
                      item: item,
                      onChange: onChange,
                      tileBgColor: tileBgColor,
                      tileBgPressColor: tileBgPressColor,
                      tileTextColor: tileTextColor,
                    ))
                .toList(),
          )
        else
          Column(
            children:
                items.map((item) => _buildListItem(context, item)).toList(),
          )
      ],
    );
  }
}

class _ListSheetGalleryItem extends StatefulWidget {
  final ListSheetItem item;
  final void Function(int value) onChange;
  final Color? tileBgColor;
  final Color? tileBgPressColor;
  final Color? tileTextColor;

  const _ListSheetGalleryItem({
    required this.item,
    required this.onChange,
    this.tileBgColor,
    this.tileBgPressColor,
    this.tileTextColor,
  });

  @override
  State<_ListSheetGalleryItem> createState() => _ListSheetGalleryItemState();
}

class _ListSheetGalleryItemState extends State<_ListSheetGalleryItem> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor =
        widget.tileTextColor ?? ThemeColors.getTextColor(colorScheme);
    final iconColor =
        widget.tileTextColor ?? ThemeColors.getTextColor(colorScheme);

    final iconWidget = widget.item.icon != null
        ? Icon(widget.item.icon, size: 24, color: iconColor)
        : widget.item.getIcon?.call(context);

    return GestureDetector(
      onTap: () => widget.onChange(widget.item.value),
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: _isPressed
              ? (widget.tileBgPressColor ??
                  ThemeColors.getPrimaryColor(colorScheme).withAlpha(240))
              : (widget.tileBgColor ??
                  ThemeColors.getPrimaryColor(colorScheme).withAlpha(180)),
          borderRadius: BorderRadius.circular(24.0),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (iconWidget != null) ...[
              iconWidget,
              const SizedBox(height: 8),
            ],
            Text(
              widget.item.title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
