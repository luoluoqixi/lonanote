import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

enum WorkspaceSortType {
  updateTime,
  updateTimeRev,
  createTime,
  createTimeRev,
  name,
  nameRev,
}

class WorkspaceSortSelect extends StatelessWidget {
  final WorkspaceSortType currentSortType;
  final void Function(WorkspaceSortType sortType) onChange;
  const WorkspaceSortSelect({
    super.key,
    required this.currentSortType,
    required this.onChange,
  });

  Widget _buildSortOption(
    BuildContext context,
    String title,
    IconData icon,
    WorkspaceSortType type,
  ) {
    final isSelected = type == currentSortType;
    final colorScheme = Theme.of(context).colorScheme;
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
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 12),
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
    return PlatformSheetPage(
      titleText: "排序方式",
      contentPadding: EdgeInsets.zero,
      desiredHeight: 360,
      allowScroll: true,
      children: [
        _buildSortOption(context, '按打开时间排序', ThemeIcons.schedule(context),
            WorkspaceSortType.updateTime),
        _buildSortOption(context, '按打开时间倒序', ThemeIcons.schedule(context),
            WorkspaceSortType.updateTimeRev),
        _buildSortOption(context, '按创建时间排序', ThemeIcons.schedule(context),
            WorkspaceSortType.createTime),
        _buildSortOption(context, '按创建时间倒序', ThemeIcons.schedule(context),
            WorkspaceSortType.createTimeRev),
        _buildSortOption(context, '按名称排序', ThemeIcons.sortName(context),
            WorkspaceSortType.name),
        _buildSortOption(context, '按名称倒序', ThemeIcons.sortName(context),
            WorkspaceSortType.nameRev),
      ],
    );
  }
}
