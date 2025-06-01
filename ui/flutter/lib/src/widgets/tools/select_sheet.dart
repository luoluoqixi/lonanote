import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class SelectItem {
  final int value;
  final String title;
  final IconData? icon;

  const SelectItem({
    required this.value,
    required this.title,
    this.icon,
  });
}

class SelectSheet extends StatelessWidget {
  final int currentSortType;
  final void Function(int sortType) onChange;
  final List<SelectItem> sortTypes;
  final String? title;

  const SelectSheet({
    super.key,
    required this.currentSortType,
    required this.onChange,
    required this.sortTypes,
    this.title,
  });

  Widget _buildSortOption(
    BuildContext context,
    String title,
    IconData? icon,
    int type,
  ) {
    final isSelected = type == currentSortType;
    final colorScheme = ThemeColors.getColorScheme(context);
    final textColor = isSelected
        ? ThemeColors.getPrimaryColor(colorScheme)
        : ThemeColors.getTextColor(colorScheme);
    final iconColor = isSelected
        ? ThemeColors.getPrimaryColor(colorScheme)
        : ThemeColors.getTextGreyColor(colorScheme);

    return PlatformInkWell(
      onTap: () => onChange(type),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (icon != null) Icon(icon, size: 20, color: iconColor),
            if (icon != null) const SizedBox(width: 12),
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
      titleText: title ?? "排序方式",
      contentPadding: EdgeInsets.zero,
      desiredHeight: 360,
      allowScroll: true,
      contentBgColor: ThemeColors.getBg0Color(colorScheme),
      children: sortTypes
          .map((v) => _buildSortOption(context, v.title, v.icon, v.value))
          .toList(),
    );
  }
}
