import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/tools/cupertino_ink_response.dart';

class PlatformInkWell extends StatefulWidget {
  final GestureTapCallback? onTap;
  final GestureTapDownCallback? onTapDown;
  final GestureTapUpCallback? onTapUp;
  final GestureTapCallback? onTapCancel;
  final GestureTapCallback? onDoubleTap;
  final GestureLongPressCallback? onLongPress;
  final GestureTapCallback? onSecondaryTap;
  final GestureTapDownCallback? onSecondaryTapDown;
  final GestureTapUpCallback? onSecondaryTapUp;
  final GestureTapCallback? onSecondaryTapCancel;
  final Widget? child;
  final Color? bgColor;
  final Color? pressBgColor;
  final Color? textColor;

  final bool? forcePressColor;

  const PlatformInkWell({
    super.key,
    this.onTap,
    this.onDoubleTap,
    this.onLongPress,
    this.onTapDown,
    this.onTapUp,
    this.onTapCancel,
    this.onSecondaryTap,
    this.onSecondaryTapUp,
    this.onSecondaryTapDown,
    this.onSecondaryTapCancel,
    this.child,
    this.bgColor,
    this.pressBgColor,
    this.textColor,
    this.forcePressColor,
  });

  @override
  State<StatefulWidget> createState() => _PlatformInkkWellState();
}

class _PlatformInkkWellState extends State<PlatformInkWell> {
  bool _isPress = false;
  Timer? _pressResetTimer;

  void _setIsPress(bool isDown) {
    setState(() {
      _isPress = isDown;
    });
  }

  void _tapDown() {
    // logger.i("onTapDown");
    _pressResetTimer?.cancel();
    if (widget.onTap == null &&
        widget.onTapDown == null &&
        widget.onDoubleTap == null &&
        widget.onSecondaryTap == null &&
        widget.onSecondaryTapDown == null &&
        widget.onLongPress == null) {
      return;
    }
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
    final colorScheme = ThemeColors.getColorScheme(context);
    final bgColor = widget.bgColor ?? ThemeColors.getBg1Color(colorScheme);
    final pressBgColor =
        widget.pressBgColor ?? ThemeColors.getPressBgColor(colorScheme);
    final textColor = widget.textColor ?? ThemeColors.getTextColor(colorScheme);

    return CupertinoInkResponse(
      onTap: () {
        _delayTapUp();
        widget.onTap?.call();
      },
      onTapDown: (e) {
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
      onSecondaryTapDown: (e) {
        _tapDown();
        widget.onSecondaryTapDown?.call(e);
      },
      onSecondaryTapUp: (e) {
        _delayTapUp();
        widget.onSecondaryTapUp?.call(e);
      },
      onSecondaryTapCancel: () {
        _delayTapUp();
        widget.onSecondaryTapCancel?.call();
      },
      onSecondaryTap: widget.onSecondaryTap,
      onDoubleTap: widget.onDoubleTap,
      onLongPress: widget.onLongPress,
      child: ColoredBox(
        color:
            _isPress || widget.forcePressColor == true ? pressBgColor : bgColor,
        child: DefaultTextStyle(
          style: TextStyle(color: textColor),
          child: widget.child!,
        ),
      ),
    );
  }

  Widget _buildMaterial() {
    final forcePressColor = widget.forcePressColor == true;
    return Theme(
      data: Theme.of(context),
      child: Material(
        color: forcePressColor
            ? (widget.pressBgColor ??
                ThemeColors.getPressBgColor(
                    ThemeColors.getColorScheme(context)))
            : Colors.transparent,
        child: InkWell(
          highlightColor: widget.pressBgColor,
          overlayColor: widget.pressBgColor != null
              ? WidgetStateProperty.all(widget.pressBgColor)
              : null,
          onTap: widget.onTap,
          onDoubleTap: widget.onDoubleTap,
          onLongPress: widget.onLongPress,
          onTapDown: widget.onTapDown,
          onTapUp: widget.onTapUp,
          onTapCancel: widget.onTapCancel,
          onSecondaryTap: widget.onSecondaryTap,
          onSecondaryTapUp: widget.onSecondaryTapUp,
          onSecondaryTapDown: widget.onSecondaryTapDown,
          onSecondaryTapCancel: widget.onSecondaryTapCancel,
          child: widget.child,
        ),
      ),
    );
  }
}
