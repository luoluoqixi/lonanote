import 'package:flutter/cupertino.dart';

/// An [InkWell] equivalent for Cupertino. Simply colors the background of the container.
class CupertinoInkWell extends StatefulWidget {
  const CupertinoInkWell({
    super.key,
    required this.child,
    required this.onPressed,
  });

  final Widget? child;
  final VoidCallback? onPressed;

  bool get enabled => onPressed != null;

  @override
  State<CupertinoInkWell> createState() => _CupertinoInkWellState();
}

class _CupertinoInkWellState extends State<CupertinoInkWell> {

  bool _buttonHeldDown = false;

  void _handleTapDown(TapDownDetails event) {
    if (!_buttonHeldDown) {
      setState(() {
        _buttonHeldDown = true;
      });
    }
  }

  void _handleTapUp(TapUpDetails event) {
    if (_buttonHeldDown) {
      setState(() {
        _buttonHeldDown = false;
      });
    }
  }

  void _handleTapCancel() {
    if (_buttonHeldDown) {
      setState(() {
        _buttonHeldDown = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.enabled;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: enabled ? _handleTapDown : null,
      onTapUp: enabled ? _handleTapUp : null,
      onTapCancel: enabled ? _handleTapCancel : null,
      onTap: widget.onPressed,
      child: Semantics(
        button: true,
        child: _buttonHeldDown ? Container(
          color: CupertinoColors.secondarySystemFill.resolveFrom(context),
          child: widget.child,
        ) : widget.child,
      ),
    );
  }
}