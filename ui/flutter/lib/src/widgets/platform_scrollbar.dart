import 'package:flutter/cupertino.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/flutter/custom_cupertino_scrollbar.dart';
import 'package:lonanote/src/widgets/flutter/custom_scrollbar.dart';

class PlatformScrollbar extends StatelessWidget {
  final ScrollController controller;
  final bool? thumbVisibility;
  final bool? interactive;
  final double? thickness;
  final double? radius;
  final ValueChanged<bool>? onDragIsActiveChanged;

  final Widget child;

  const PlatformScrollbar({
    super.key,
    required this.controller,
    required this.child,
    this.thumbVisibility,
    this.interactive,
    this.thickness,
    this.radius,
    this.onDragIsActiveChanged,
  });

  void _handleDragIsActiveChanged(bool isActive) {
    if (onDragIsActiveChanged != null) {
      if (isActive) {
        onDragIsActiveChanged!(true);
      } else {
        WidgetsBinding.instance
            .addPostFrameCallback((_) => onDragIsActiveChanged!(false));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, platform) => CustomScrollbar(
        controller: controller,
        thumbVisibility: thumbVisibility ?? false,
        interactive: interactive ?? true,
        thickness: thickness ?? 8.0,
        radius: Radius.circular(radius ?? 10.0),
        onDragIsActiveChanged:
            onDragIsActiveChanged != null ? _handleDragIsActiveChanged : null,
        child: child,
      ),
      // IOS滚动条体验存在问题:
      // https://github.com/flutter/flutter/issues/83198
      cupertino: (context, platform) => CustomCupertinoScrollbar(
        controller: controller,
        thumbVisibility: thumbVisibility ?? false,
        thickness: thickness ?? 3.0,
        radius: Radius.circular(radius ?? 10.0),
        onDragIsActiveChanged:
            onDragIsActiveChanged != null ? _handleDragIsActiveChanged : null,
        child: child,
      ),
    );
  }
}
