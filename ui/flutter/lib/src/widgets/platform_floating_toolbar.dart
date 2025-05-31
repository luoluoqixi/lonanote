import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformFloatingToolbar extends StatelessWidget {
  final List<Widget> children;

  final double? left;
  final double? top;
  final double? right;
  final double? bottom;
  final double? width;
  final double? height;

  final Color? bgColor;

  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? contentPadding;

  const PlatformFloatingToolbar({
    super.key,
    required this.children,
    this.left,
    this.top,
    this.right,
    this.bottom,
    this.width,
    this.height,
    this.bgColor,
    this.padding,
    this.contentPadding,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final content = Padding(
      padding: contentPadding ??
          const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: children,
      ),
    );
    final bgColor = this.bgColor ?? ThemeColors.getBg0Color(colorScheme);
    return Positioned(
      top: top,
      left: left ?? 20,
      right: right ?? 20,
      bottom: bottom ?? 20,
      width: width,
      height: height,
      child: SafeArea(
        bottom: true,
        left: true,
        right: true,
        child: PlatformWidget(
          material: (context, platform) => Material(
            elevation: 6,
            borderRadius: BorderRadius.circular(12),
            color: ThemeColors.getBg0Color(Theme.of(context).colorScheme),
            child: content,
          ),
          cupertino: (context, platform) => Container(
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: CupertinoColors.black.withAlpha(51),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: content,
          ),
        ),
      ),
    );
  }
}
