import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class PlatformButton extends StatelessWidget {
  final double? width;
  final String? labelText;
  final Widget? label;

  final VoidCallback? onPressed;

  final Color? shadowColor;

  final EdgeInsetsGeometry? padding;
  final AlignmentGeometry? alignment;
  final Color? color;
  final VoidCallback? onLongPress;


  final PlatformBuilder<CupertinoElevatedButtonData>? cupertino;
  final PlatformBuilder<MaterialElevatedButtonData>? material;

  const PlatformButton({
    super.key,
    this.width,
    this.label,
    this.labelText,
    this.onPressed,
    this.shadowColor,
    this.padding,
    this.alignment,
    this.color,
    this.onLongPress,
    this.material,
    this.cupertino,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final padding = this.padding ?? const EdgeInsets.symmetric(vertical: 14);
    return SizedBox(
      width: width ?? double.infinity,
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
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                    ),
                    padding: padding,
                    shadowColor: shadowColor ?? Colors.transparent,
                  ),
                ),
        cupertino: cupertino,
        child: label ?? (labelText != null ? PlatformText(labelText!) : null),
      ),
    );
  }
}
