import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';

abstract class _ParentCupertinoInkResponseState {
  void markInkResponsePressed(
      _ParentCupertinoInkResponseState childState, bool value);
}

class _ParentCupertinoInkResponseProvider extends InheritedWidget {
  const _ParentCupertinoInkResponseProvider({
    required this.state,
    required super.child,
  });

  final _ParentCupertinoInkResponseState state;

  @override
  bool updateShouldNotify(_ParentCupertinoInkResponseProvider oldWidget) =>
      state != oldWidget.state;

  static _ParentCupertinoInkResponseState? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<
            _ParentCupertinoInkResponseProvider>()
        ?.state;
  }
}

/// https://itome.team/blog/2021/09/nested-custom-clickable-widget/
class CupertinoInkResponse extends StatefulWidget {
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

  const CupertinoInkResponse({
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
  });

  @override
  State<StatefulWidget> createState() => _CupertinoInkResponseState();
}

class _CupertinoInkResponseState extends State<CupertinoInkResponse>
    with SingleTickerProviderStateMixin
    implements _ParentCupertinoInkResponseState {
  bool get enabled => isWidgetEnabled(widget);
  bool get _primaryEnabled => _primaryButtonEnabled(widget);
  bool get _secondaryEnabled => _secondaryButtonEnabled(widget);

  final _activeChildren = ObserverList<_ParentCupertinoInkResponseState>();
  bool get _anyChildInkResponsePressed => _activeChildren.isNotEmpty;

  _ParentCupertinoInkResponseState? get _parentState {
    return _ParentCupertinoInkResponseProvider.maybeOf(context);
  }

  bool isWidgetEnabled(CupertinoInkResponse widget) {
    return _primaryButtonEnabled(widget) || _secondaryButtonEnabled(widget);
  }

  bool _primaryButtonEnabled(CupertinoInkResponse widget) {
    return widget.onTap != null ||
        widget.onDoubleTap != null ||
        widget.onLongPress != null ||
        widget.onTapUp != null ||
        widget.onTapDown != null;
  }

  bool _secondaryButtonEnabled(CupertinoInkResponse widget) {
    return widget.onSecondaryTap != null ||
        widget.onSecondaryTapUp != null ||
        widget.onSecondaryTapDown != null;
  }

  @override
  void markInkResponsePressed(
      _ParentCupertinoInkResponseState childState, bool value) {
    final bool lastAnyPressed = _anyChildInkResponsePressed;
    if (value) {
      _activeChildren.add(childState);
    } else {
      _activeChildren.remove(childState);
    }
    final bool nowAnyPressed = _anyChildInkResponsePressed;
    if (nowAnyPressed != lastAnyPressed) {
      _parentState?.markInkResponsePressed(this, nowAnyPressed);
    }
  }

  void handleTapDown(TapDownDetails details) {
    if (!_anyChildInkResponsePressed) {
      widget.onTapDown?.call(details);
    }
    _parentState?.markInkResponsePressed(this, true);
  }

  void handleTapUp(TapUpDetails details) {
    widget.onTapUp?.call(details);
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleTap() {
    widget.onTap?.call();
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleTapCancel() {
    widget.onTapCancel?.call();
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleSecondaryTapDown(TapDownDetails details) {
    if (!_anyChildInkResponsePressed) {
      widget.onSecondaryTapDown?.call(details);
    }
    _parentState?.markInkResponsePressed(this, true);
  }

  void handleSecondaryTapUp(TapUpDetails details) {
    widget.onSecondaryTapUp?.call(details);
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleSecondaryTap() {
    widget.onSecondaryTap?.call();
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleSecondaryTapCancel() {
    widget.onSecondaryTapCancel?.call();
    _parentState?.markInkResponsePressed(this, false);
  }

  void handleDoubleTap() {
    widget.onDoubleTap?.call();
  }

  void handleLongPress() {
    widget.onLongPress?.call();
  }

  @override
  Widget build(BuildContext context) {
    return _ParentCupertinoInkResponseProvider(
      state: this,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: _primaryEnabled ? handleTapDown : null,
        onTapUp: _primaryEnabled ? handleTapUp : null,
        onTap: _primaryEnabled ? handleTap : null,
        onTapCancel: _primaryEnabled ? handleTapCancel : null,
        onDoubleTap: widget.onDoubleTap != null ? handleDoubleTap : null,
        onLongPress: widget.onLongPress != null ? handleLongPress : null,
        onSecondaryTapDown: _secondaryEnabled ? handleSecondaryTapDown : null,
        onSecondaryTapUp: _secondaryEnabled ? handleSecondaryTapUp : null,
        onSecondaryTap: _secondaryEnabled ? handleSecondaryTap : null,
        onSecondaryTapCancel:
            _secondaryEnabled ? handleSecondaryTapCancel : null,
        child: widget.child,
      ),
    );
  }
}
