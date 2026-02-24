import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/tools/cupertino_ink_response.dart';

class PlatformInkResponse extends StatelessWidget {
  final Widget child;
  final bool? disable;

  const PlatformInkResponse({
    super.key,
    required this.child,
    this.disable,
  });

  void _tapDown(TapDownDetails e) {}

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, platform) => child,
      cupertino: (context, platform) => CupertinoInkResponse(
        onTapDown: disable == true ? null : _tapDown,
        onSecondaryTapDown: disable == true ? null : _tapDown,
        child: child,
      ),
    );
  }
}
