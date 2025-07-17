import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:lonanote/src/icons/svg_icons.dart';

class ThemeIcons {
  static IconData add(BuildContext context) {
    return isMaterial(context) ? Icons.add : CupertinoIcons.add;
  }

  static IconData addFolder(BuildContext context) {
    return isMaterial(context)
        ? Icons.create_new_folder_outlined
        : Icons.create_new_folder_outlined;
  }

  static IconData arrowDropDown(BuildContext context) {
    return isMaterial(context) ? Icons.arrow_drop_down : Icons.arrow_drop_down;
  }

  static IconData arrowBack(BuildContext context) {
    return isMaterial(context) ? Icons.arrow_back : Icons.arrow_back;
  }

  static IconData arrowBackIos(BuildContext context) {
    return isMaterial(context)
        ? Icons.arrow_back_ios_new
        : Icons.arrow_back_ios_new;
  }

  static IconData check(BuildContext context) {
    return isMaterial(context) ? Icons.check : Icons.check;
  }

  static IconData chevronLeft(BuildContext context) {
    return isMaterial(context) ? Icons.chevron_left : Icons.chevron_left;
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

  static IconData edit(BuildContext context) {
    return isMaterial(context) ? Icons.edit : Icons.edit;
  }

  static IconData file(BuildContext context) {
    return isMaterial(context)
        ? Icons.insert_drive_file
        : Icons.insert_drive_file;
  }

  static IconData folder(BuildContext context) {
    return isMaterial(context) ? Icons.folder : Icons.folder;
  }

  static IconData folderOutlined(BuildContext context) {
    return isMaterial(context)
        ? FontAwesomeIcons.folderOpen
        : FontAwesomeIcons.folderOpen;
  }

  static IconData image(BuildContext context) {
    return isMaterial(context) ? Icons.image : Icons.image;
  }

  static IconData keyboardArrowDown(BuildContext context) {
    return isMaterial(context)
        ? Icons.keyboard_arrow_down
        : Icons.keyboard_arrow_down;
  }

  static SvgPicture markdown(
    BuildContext context, {
    Color color = Colors.white,
    double width = 42,
    double height = 42,
  }) {
    return isMaterial(context)
        ? SvgIcons.markdown(color: color, width: width, height: height)
        : SvgIcons.markdown(color: color, width: width, height: height);
  }

  static IconData more(BuildContext context) {
    return isMaterial(context) ? Icons.more_vert : Icons.more_horiz;
  }

  static IconData preview(BuildContext context) {
    return isMaterial(context) ? Icons.preview : Icons.preview;
  }

  static IconData radio(BuildContext context, bool check) {
    return check ? Icons.check_circle : Icons.radio_button_unchecked;
  }

  static IconData redo(BuildContext context) {
    return isMaterial(context) ? Icons.redo : Icons.redo;
  }

  static IconData refresh(BuildContext context) {
    return isMaterial(context) ? Icons.refresh : Icons.refresh;
  }

  static IconData rename(BuildContext context) {
    return isMaterial(context)
        ? Icons.drive_file_rename_outline
        : Icons.drive_file_rename_outline;
  }

  static IconData save(BuildContext context) {
    return isMaterial(context) ? Icons.save : Icons.save;
  }

  static IconData schedule(BuildContext context) {
    return isMaterial(context) ? Icons.schedule : Icons.schedule;
  }

  static IconData search(BuildContext context) {
    return isMaterial(context) ? Icons.search : Icons.search;
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

  static IconData swap(BuildContext context) {
    return isMaterial(context) ? Icons.swap_horiz : Icons.swap_horiz;
  }

  static IconData tune(BuildContext context) {
    return isMaterial(context) ? Icons.tune : Icons.tune;
  }

  static IconData undo(BuildContext context) {
    return isMaterial(context) ? Icons.undo : Icons.undo;
  }

  static IconData video(BuildContext context) {
    return isMaterial(context) ? Icons.video_call : Icons.video_call;
  }

  static IconData workspace(BuildContext context) {
    return isMaterial(context) ? FontAwesomeIcons.cube : FontAwesomeIcons.cube;
  }
}
