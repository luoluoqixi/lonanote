import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/platform_ink_response.dart';

class PlatformIconBtn extends StatelessWidget {
  final Key? widgetKey;

  final Widget? icon;
  final Widget? cupertinoIcon;
  final Widget? materialIcon;
  final void Function()? onPressed;
  final Color? color;
  final EdgeInsets? padding;
  final Color? disabledColor;
  final VoidCallback? onLongPress;
  final bool? disable;

  final PlatformBuilder<MaterialIconButtonData>? material;
  final PlatformBuilder<CupertinoIconButtonData>? cupertino;

  const PlatformIconBtn({
    super.key,
    this.widgetKey,
    this.icon,
    this.cupertinoIcon,
    this.materialIcon,
    this.onPressed,
    this.color,
    this.disabledColor,
    this.padding,
    this.onLongPress,
    this.disable,
    this.material,
    this.cupertino,
  });

  @override
  Widget build(BuildContext context) {
    return PlatformInkResponse(
      disable: disable,
      child: PlatformIconButton(
        icon: icon,
        cupertinoIcon: cupertinoIcon,
        materialIcon: materialIcon,
        onPressed: onPressed,
        color: color,
        disabledColor: disabledColor,
        padding: padding,
        onLongPress: onLongPress,
        material: material,
        cupertino: cupertino,
      ),
    );
  }
}
