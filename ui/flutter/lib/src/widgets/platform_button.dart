import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class PlatformButton extends StatelessWidget {
  final double? width;
  final double? height;
  final String? labelText;
  final Widget? label;

  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;
  final Color? shadowColor;

  final EdgeInsetsGeometry? padding;
  final AlignmentGeometry? alignment;
  final Color? color;
  final BorderRadius? borderRadius;
  final double? pressedOpacity;

  final PlatformBuilder<CupertinoElevatedButtonData>? cupertino;
  final PlatformBuilder<MaterialElevatedButtonData>? material;

  const PlatformButton({
    super.key,
    this.width,
    this.height,
    this.label,
    this.labelText,
    this.onPressed,
    this.onLongPress,
    this.shadowColor,
    this.padding,
    this.alignment,
    this.color,
    this.borderRadius,
    this.pressedOpacity,
    this.material,
    this.cupertino,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final padding = this.padding ?? const EdgeInsets.symmetric(vertical: 14);
    final borderRadius =
        this.borderRadius ?? BorderRadius.all(Radius.circular(10));
    return SizedBox(
      width: width,
      height: height,
      child: PlatformElevatedButton(
        onPressed: onPressed,
        padding: padding,
        alignment: alignment,
        color: color,
        onLongPress: onLongPress,
        material: material ??
            (builder, context) => MaterialElevatedButtonData(
                  style: TextButton.styleFrom(
                    side: BorderSide(
                      color: colorScheme.primary,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: borderRadius,
                    ),
                    padding: padding,
                    shadowColor: shadowColor ?? Colors.transparent,
                  ),
                ),
        cupertino: cupertino ??
            (builder, context) => CupertinoElevatedButtonData(
                  borderRadius: borderRadius,
                  pressedOpacity: pressedOpacity,
                ),
        child: label ?? (labelText != null ? PlatformText(labelText!) : null),
      ),
    );
  }
}
