import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformInkWell extends StatefulWidget {
  final GestureTapCallback? onTap;
  final GestureTapDownCallback? onTapDown;
  final GestureTapUpCallback? onTapUp;
  final GestureTapCallback? onTapCancel;
  final GestureTapCallback? onDoubleTap;
  final GestureLongPressCallback? onLongPress;
  final Widget? child;
  final Color? bgColor;
  final Color? pressBgColor;
  final Color? textColor;

  const PlatformInkWell({
    super.key,
    this.onTap,
    this.onTapDown,
    this.onTapUp,
    this.onTapCancel,
    this.onDoubleTap,
    this.onLongPress,
    this.child,
    this.bgColor,
    this.pressBgColor,
    this.textColor,
  });

  @override
  State<StatefulWidget> createState() => _InkkWellState();
}

class _InkkWellState extends State<PlatformInkWell> {
  bool _isPress = false;
  Timer? _pressResetTimer;

  void _setIsPress(bool isDown) {
    setState(() {
      _isPress = isDown;
    });
  }

  void _tapDown() {
    _pressResetTimer?.cancel();
    _setIsPress(true);
  }

  void _delayTapUp() {
    _pressResetTimer?.cancel();
    _pressResetTimer = Timer(const Duration(milliseconds: 100), () {
      if (mounted) {
        _setIsPress(false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (_, __) => _buildMaterial(),
      cupertino: (context, __) => _buildCupertino(context),
    );
  }

  Widget? _buildCupertino(BuildContext context) {
    // return Theme(
    //   data: Theme.of(context).copyWith(
    //     splashFactory: InkRipple.splashFactory,
    //   ),
    //   child: Material(
    //     color: Colors.transparent,
    //     child: InkWell(
    //       onTap: widget.onTap,
    //       onTapDown: widget.onTapDown,
    //       onTapUp: widget.onTapUp,
    //       onTapCancel: widget.onTapCancel,
    //       onDoubleTap: widget.onDoubleTap,
    //       onLongPress: widget.onLongPress,
    //       child: widget.child,
    //     ),
    //   ),
    // );
    final colorScheme = Theme.of(context).colorScheme;
    final bgColor = widget.bgColor ?? ThemeColors.getBgColor(colorScheme);
    final pressBgColor =
        widget.pressBgColor ?? ThemeColors.getPressBgColor(colorScheme);
    final textColor = widget.textColor ?? ThemeColors.getTextColor(colorScheme);

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              _delayTapUp();
              widget.onTap?.call();
            },
            onTapDown: (e) {
              // logger.i("onTapDown");
              _tapDown();
              widget.onTapDown?.call(e);
            },
            onTapUp: (e) {
              _delayTapUp();
              widget.onTapUp?.call(e);
            },
            onTapCancel: () {
              _delayTapUp();
              widget.onTapCancel?.call();
            },
            onDoubleTap: widget.onDoubleTap,
            onLongPress: widget.onLongPress,
            child: ColoredBox(
              color: _isPress ? pressBgColor : bgColor,
            ),
          ),
        ),
        DefaultTextStyle(
          style: TextStyle(color: textColor),
          child: widget.child!,
        ),
      ],
    );
  }

  Widget _buildMaterial() {
    return Theme(
      data: Theme.of(context),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          onTapDown: widget.onTapDown,
          onTapUp: widget.onTapUp,
          onTapCancel: widget.onTapCancel,
          onDoubleTap: widget.onDoubleTap,
          onLongPress: widget.onLongPress,
          child: widget.child,
        ),
      ),
    );
  }
}
