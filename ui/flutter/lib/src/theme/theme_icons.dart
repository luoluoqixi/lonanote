import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class ThemeIcons {
  static IconData add(BuildContext context) {
    return isMaterial(context) ? Icons.add : CupertinoIcons.add;
  }

  static IconData arrowDropDown(BuildContext context) {
    return isMaterial(context) ? Icons.arrow_drop_down : Icons.arrow_drop_down;
  }

  static IconData check(BuildContext context) {
    return isMaterial(context) ? Icons.check : Icons.check;
  }

  static IconData swap(BuildContext context) {
    return isMaterial(context) ? Icons.swap_horiz : Icons.swap_horiz;
  }

  static IconData chevronRight(BuildContext context) {
    return isMaterial(context) ? Icons.chevron_right : Icons.chevron_right;
  }

  static IconData circle(BuildContext context) {
    return isMaterial(context) ? Icons.circle : Icons.circle;
  }

  static IconData close(BuildContext context) {
    return isMaterial(context) ? Icons.close : Icons.close;
  }

  static IconData delete(BuildContext context) {
    return isMaterial(context) ? Icons.delete_outline : Icons.delete_outline;
  }

  static IconData file(BuildContext context) {
    return isMaterial(context)
        ? Icons.insert_drive_file
        : Icons.insert_drive_file;
  }

  static IconData folder(BuildContext context) {
    return isMaterial(context) ? Icons.folder : Icons.folder;
  }

  static IconData image(BuildContext context) {
    return isMaterial(context) ? Icons.image : Icons.image;
  }

  static IconData keyboardArrowDown(BuildContext context) {
    return isMaterial(context)
        ? Icons.keyboard_arrow_down
        : Icons.keyboard_arrow_down;
  }

  static IconData markdown(BuildContext context) {
    return isMaterial(context) ? Icons.description : Icons.description;
  }

  static IconData more(BuildContext context) {
    return isMaterial(context) ? Icons.more_vert : Icons.more_horiz;
  }

  static IconData radio(BuildContext context, bool check) {
    return check ? Icons.check_circle : Icons.radio_button_unchecked;
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

  static IconData tune(BuildContext context) {
    return isMaterial(context) ? Icons.tune : Icons.tune;
  }

  static IconData video(BuildContext context) {
    return isMaterial(context) ? Icons.video_call : Icons.video_call;
  }
}
