import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class ThemeIcons {
  static IconData add(BuildContext context) {
    return isMaterial(context) ? Icons.add : CupertinoIcons.add;
  }

  static IconData check(BuildContext context) {
    return isMaterial(context) ? Icons.check : Icons.check;
  }

  static IconData close(BuildContext context) {
    return isMaterial(context) ? Icons.close : Icons.close;
  }

  static IconData delete(BuildContext context) {
    return isMaterial(context) ? Icons.delete_outline : Icons.delete_outline;
  }

  static IconData more(BuildContext context) {
    return isMaterial(context) ? Icons.more_vert : Icons.more_horiz;
  }

  static IconData schedule(BuildContext context) {
    return isMaterial(context) ? Icons.schedule : Icons.schedule;
  }

  static IconData select(BuildContext context) {
    return isMaterial(context)
        ? Icons.check_circle_outline
        : Icons.check_circle_outline;
  }

  static IconData settings(BuildContext context) {
    return isMaterial(context) ? Icons.settings : CupertinoIcons.settings;
  }

  static IconData sort(BuildContext context) {
    return Icons.sort;
  }

  static IconData sortName(BuildContext context) {
    return isMaterial(context) ? Icons.sort_by_alpha : Icons.sort_by_alpha;
  }
}
