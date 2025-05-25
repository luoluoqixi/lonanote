import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class ThemeIcons {
  static IconData more(BuildContext context) {
    return isMaterial(context) ? Icons.more_vert : Icons.more_horiz;
  }
}
