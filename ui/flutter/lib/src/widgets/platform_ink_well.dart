import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/widgets/cupertino_ink_well.dart';

class PlatformInkWell extends StatelessWidget {
  final void Function()? onTap;
  final Widget? child;

  const PlatformInkWell({
    super.key,
    this.onTap,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (_, __) => _buildMaterial(),
      cupertino: (_, __) => _buildCupertino(),
    );
  }

  Widget _buildCupertino() {
    return CupertinoInkWell(
      onPressed: () {
        if (onTap != null) {
          onTap!();
        }
      },
      child: child,
    );
  }

  Widget _buildMaterial() {
    return InkWell(
      onTap: () {
        if (onTap != null) {
          onTap!();
        }
      },
      child: child,
    );
  }
}
