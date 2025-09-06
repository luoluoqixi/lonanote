import 'package:flutter/material.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/editor/editor_page.dart';

class EditorTextStyleToolbar extends StatelessWidget {
  final void Function(String value)? onAction;
  final EditorSelectionData selectionData;

  bool get _isAnyHeadingSelected =>
      selectionData.isHeading1 ||
      selectionData.isHeading2 ||
      selectionData.isHeading3 ||
      selectionData.isHeading4 ||
      selectionData.isHeading5 ||
      selectionData.isHeading6;

  const EditorTextStyleToolbar({
    super.key,
    required this.onAction,
    required this.selectionData,
  });

  Widget _buildToggleButton({
    required ColorScheme colorScheme,
    required bool isSelected,
    required VoidCallback onPressed,
    Widget? icon,
    String? label,
    Size? size,
  }) {
    final primaryColor = ThemeColors.getPrimaryColor(colorScheme);
    return IconButton(
      onPressed: onPressed,
      icon: icon ??
          Text(
            label ?? "",
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 14,
            ),
          ),
      style: ElevatedButton.styleFrom(
        backgroundColor:
            isSelected ? primaryColor.withAlpha(51) : Colors.transparent,
        foregroundColor: isSelected ? primaryColor : Colors.grey[700],
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: size ?? const Size(48, 36),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected ? primaryColor : Colors.grey[300]!,
            width: 1,
          ),
        ),
        elevation: 0,
      ),
    );
  }

  Widget _buildHeadingButton(
    ColorScheme colorScheme,
    String label,
    int level,
    bool isSelected,
    double width,
    double height,
  ) {
    return _buildToggleButton(
      colorScheme: colorScheme,
      label: label,
      isSelected: isSelected,
      onPressed: () => onAction?.call('h$level'),
      size: Size(width, height),
    );
  }

  Widget _buildHeadingRow() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final colorScheme = ThemeColors.getColorScheme(context);

        final availableWidth = constraints.maxWidth;
        final buttonCount = 7;
        final spacing = 6.0;
        final totalSpacing = spacing * (buttonCount - 1);
        final buttonWidth = (availableWidth - totalSpacing) / buttonCount;
        final buttonHeight = 50.0;

        return IntrinsicWidth(
          child: Row(
            spacing: spacing,
            children: [
              _buildHeadingButton(colorScheme, 'H1', 1,
                  selectionData.isHeading1, buttonWidth, buttonHeight),
              _buildHeadingButton(colorScheme, 'H2', 2,
                  selectionData.isHeading2, buttonWidth, buttonHeight),
              _buildHeadingButton(colorScheme, 'H3', 3,
                  selectionData.isHeading3, buttonWidth, buttonHeight),
              _buildHeadingButton(colorScheme, 'H4', 4,
                  selectionData.isHeading4, buttonWidth, buttonHeight),
              _buildHeadingButton(colorScheme, 'H5', 5,
                  selectionData.isHeading5, buttonWidth, buttonHeight),
              _buildHeadingButton(colorScheme, 'H6', 6,
                  selectionData.isHeading6, buttonWidth, buttonHeight),
              _buildToggleButton(
                colorScheme: colorScheme,
                label: '正文',
                isSelected: !_isAnyHeadingSelected,
                onPressed: () => onAction?.call('text'),
                size: Size(buttonWidth, buttonHeight),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSecondRow() {
    return LayoutBuilder(builder: (context, constraints) {
      final colorScheme = ThemeColors.getColorScheme(context);

      final availableWidth = constraints.maxWidth;
      final buttonCount = 4;
      final spacing = 6.0;
      final totalSpacing = spacing * (buttonCount - 1);
      final buttonWidth = (availableWidth - totalSpacing) / buttonCount;
      final buttonHeight = 80.0;

      return IntrinsicWidth(
        child: Row(
          spacing: spacing,
          children: [
            _buildToggleButton(
              colorScheme: colorScheme,
              icon: Icon(ThemeIcons.bulletedList(context)),
              isSelected: selectionData.isUnorderedList,
              onPressed: () => onAction?.call('unorderedList'),
              size: Size(buttonWidth, buttonHeight),
            ),
            _buildToggleButton(
              colorScheme: colorScheme,
              icon: Icon(ThemeIcons.orderedList(context)),
              isSelected: selectionData.isOrderedList,
              onPressed: () => onAction?.call('orderedList'),
              size: Size(buttonWidth, buttonHeight),
            ),
            _buildToggleButton(
              colorScheme: colorScheme,
              icon: Icon(ThemeIcons.taskList(context)),
              isSelected: selectionData.isTaskList,
              onPressed: () => onAction?.call('taskList'),
              size: Size(buttonWidth, buttonHeight),
            ),
            _buildToggleButton(
              colorScheme: colorScheme,
              icon: Icon(ThemeIcons.blockquote(context)),
              isSelected: selectionData.isBlockquote,
              onPressed: () => onAction?.call('blockquote'),
              size: Size(buttonWidth, buttonHeight),
            ),
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeadingRow(),
          const SizedBox(height: 12),
          _buildSecondRow(),
        ],
      ),
    );
  }
}
