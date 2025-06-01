import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';
import 'package:pull_down_button/pull_down_button.dart';

class PlatformPullDownButton extends StatelessWidget {
  final PullDownMenuItemBuilder itemBuilder;
  final PullDownMenuButtonBuilder? buttonBuilder;
  final Widget? buttonIcon;
  final void Function(Future<void> Function() showMenu)? buttonOnPressed;
  final void Function()? buttonOnLongPress;
  final bool? disable;

  final PlatformBuilder<MaterialIconButtonData>? material;
  final PlatformBuilder<CupertinoIconButtonData>? cupertino;

  const PlatformPullDownButton({
    super.key,
    required this.itemBuilder,
    this.buttonBuilder,
    this.buttonIcon,
    this.buttonOnPressed,
    this.buttonOnLongPress,
    this.disable,
    this.material,
    this.cupertino,
  });

  Widget buildButton(BuildContext context) {
    return PullDownButton(
      itemBuilder: itemBuilder,
      buttonBuilder: buttonBuilder ??
          (context, showMenu) => PlatformIconBtn(
                onLongPress: buttonOnLongPress,
                onPressed: (disable == true)
                    ? null
                    : (buttonOnPressed != null
                        ? () => buttonOnPressed!(showMenu)
                        : showMenu),
                materialIcon: buttonIcon,
                cupertinoIcon: buttonIcon,
                cupertino: cupertino ??
                    (context, platform) => CupertinoIconButtonData(),
                material: material,
              ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, platform) => buildButton(context),
      cupertino: (context, platform) => buildButton(context),
    );
  }
}
