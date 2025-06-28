import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformFloatingToolbar extends StatelessWidget {
  final List<Widget> children;
  final MainAxisAlignment mainAxisAlignment;

  final bool visible;

  final double? left;
  final double? top;
  final double? right;
  final double? bottom;

  final bool fixedSize;
  final double? width;
  final double? height;

  final Color? bgColor;

  final EdgeInsetsGeometry? contentPadding;

  const PlatformFloatingToolbar({
    super.key,
    this.visible = true,
    required this.children,
    this.mainAxisAlignment = MainAxisAlignment.center,
    this.left = 20,
    this.top,
    this.right = 20,
    this.bottom = 20,
    this.fixedSize = false,
    this.width,
    this.height,
    this.bgColor,
    this.contentPadding,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final content = Padding(
      padding: contentPadding ??
          const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: DefaultTextStyle(
        style: TextStyle(
          color: ThemeColors.getTextColor(colorScheme),
        ),
        child: Row(
          mainAxisAlignment: mainAxisAlignment,
          children: children,
        ),
      ),
    );
    final bgColor = this.bgColor ?? ThemeColors.getBg1Color(colorScheme);

    final widget = PlatformWidget(
      material: (context, platform) => Material(
        elevation: 1,
        borderRadius: BorderRadius.circular(30),
        color: bgColor,
        child: content,
      ),
      cupertino: (context, platform) => Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: CupertinoColors.black.withAlpha(30),
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: content,
      ),
    );
    return Positioned(
      top: top,
      left: left,
      right: right,
      bottom: bottom,
      child: Visibility(
        visible: visible,
        maintainState: true,
        maintainSize: false,
        child: SafeArea(
          bottom: true,
          left: true,
          right: true,
          child: fixedSize
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: width,
                      height: height,
                      child: widget,
                    ),
                  ],
                )
              : widget,
        ),
      ),
    );
  }
}
