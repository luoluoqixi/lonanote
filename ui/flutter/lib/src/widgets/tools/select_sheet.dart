import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SelectSheetItem {
  final int value;
  final String title;
  final IconData? icon;
  final Widget? Function(BuildContext context)? getIcon;

  const SelectSheetItem({
    required this.value,
    required this.title,
    this.icon,
    this.getIcon,
  });
}

class SelectSheet extends StatelessWidget {
  final int currentValue;
  final void Function(int value) onChange;
  final List<SelectSheetItem> items;
  final String? title;
  final double? desiredHeight;

  const SelectSheet({
    super.key,
    required this.currentValue,
    required this.onChange,
    required this.items,
    this.title,
    this.desiredHeight,
  });

  Widget _buildItem(
    BuildContext context,
    String title,
    IconData? icon,
    Widget? Function(BuildContext context)? getIcon,
    int value,
  ) {
    final isSelected = value == currentValue;
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor = isSelected
        ? ThemeColors.getPrimaryColor(colorScheme)
        : ThemeColors.getTextColor(colorScheme);
    final iconColor = isSelected
        ? ThemeColors.getPrimaryColor(colorScheme)
        : ThemeColors.getTextGreyColor(colorScheme);

    final iconWidget = icon != null
        ? Icon(icon, size: 20, color: iconColor)
        : getIcon?.call(context);

    return PlatformInkWell(
      onTap: () => onChange(value),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (iconWidget != null) iconWidget,
            if (iconWidget != null) const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  color: textColor,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected)
              Icon(
                ThemeIcons.check(context),
                size: 20,
                color: ThemeColors.getPrimaryColor(colorScheme),
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
      titleText: title ?? "选择",
      contentPadding: EdgeInsets.zero,
      desiredHeight: desiredHeight ?? 360,
      allowScroll: true,
      contentBgColor: ThemeColors.getBg1Color(colorScheme),
      children: items
          .map((v) => _buildItem(context, v.title, v.icon, v.getIcon, v.value))
          .toList(),
    );
  }
}
