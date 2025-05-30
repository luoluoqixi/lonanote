import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/tools/cupertino_ink_response.dart';

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
    this.material,
    this.cupertino,
  });

  Widget buildBtn(BuildContext context) {
    return PlatformIconButton(
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
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, _) => buildBtn(context),
      cupertino: (context, _) => CupertinoInkResponse(
        onTap: onPressed != null ? () {} : null,
        child: buildBtn(context),
      ),
    );
  }
}
