import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformPopupMenuOption extends PopupMenuOption {
  final String? value;
  final void Function(PlatformPopupMenuOption)? onClick;

  static void _defaultOnTap(PopupMenuOption option) {
    if (option is PlatformPopupMenuOption) {
      option.onClick?.call(option);
    }
  }

  PlatformPopupMenuOption({
    this.value,
    this.onClick,
    super.label,
    super.material,
    super.cupertino,
  }) : super(onTap: _defaultOnTap);
}

class PlatformPopupMenuButton extends StatelessWidget {
  final Widget icon;
  final String? tooltip;
  final List<PlatformPopupMenuOption> options;

  const PlatformPopupMenuButton({
    super.key,
    required this.icon,
    required this.options,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformPopupMenu(
      icon: icon,
      material: (context, platform) => MaterialPopupMenuData(
        tooltip: tooltip,
        offset: const Offset(0, 50),
        elevation: 1,
        color: ThemeColors.getBg0Color(colorScheme),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
        ),
      ),
      // cupertino: (context, platform) => CupertinoPopupMenuData(),
      options: options,
    );
  }
}
