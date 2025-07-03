import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';

class PlatformDoubleBack extends StatefulWidget {
  final bool isEnable;
  final bool Function()? onWillPop;
  final String? exitMsg;
  final int exitSeconds;

  final Widget child;

  const PlatformDoubleBack({
    super.key,
    required this.child,
    this.isEnable = false,
    this.onWillPop,
    this.exitMsg,
    this.exitSeconds = 2,
  });

  @override
  State<StatefulWidget> createState() => _PlatformDoubleBackState();
}

class _PlatformDoubleBackState extends State<PlatformDoubleBack> {
  DateTime? currentBackPressTime;
  bool canPopNow = false;

  @override
  Widget build(BuildContext context) {
    final isEnable = (widget.isEnable || widget.onWillPop != null) &&
        Theme.of(context).platform == TargetPlatform.android;
    return isEnable
        ? PopScope(
            canPop: canPopNow,
            onPopInvokedWithResult: _onPopInvoked,
            child: widget.child,
          )
        : widget.child;
  }

  void _onPopInvoked<T>(bool didPop, T result) {
    if (widget.onWillPop != null) {
      bool canPop = widget.onWillPop!();
      if (!canPop) {
        return;
      }
    }
    DateTime now = DateTime.now();
    if (currentBackPressTime == null ||
        now.difference(currentBackPressTime!) >
            Duration(seconds: widget.exitSeconds)) {
      currentBackPressTime = now;
      Fluttertoast.showToast(msg: widget.exitMsg ?? "再按一次退出");
      Future.delayed(
        Duration(seconds: widget.exitSeconds),
        () {
          setState(() {
            canPopNow = false;
          });
          Fluttertoast.cancel();
        },
      );
      setState(() {
        canPopNow = true;
      });
    }
  }
}
