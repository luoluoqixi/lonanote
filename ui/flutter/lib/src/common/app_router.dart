import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/views/settings/about_page.dart';
import 'package:lonanote/src/views/settings/personalization_settings_page.dart';
import 'package:lonanote/src/views/settings/settings_page.dart';
import 'package:lonanote/src/views/settings/workspace_settings_page.dart';
import 'package:lonanote/src/views/workspace/select_workspace_page.dart';
import 'package:lonanote/src/views/workspace/workspace_home_page.dart';
import 'package:lonanote/src/widgets/tools/edit_sheet.dart';
import 'package:lonanote/src/widgets/tools/select_sheet.dart';

class AppRouter {
  static RouteObserver<ModalRoute<void>> routeObserver =
      RouteObserver<ModalRoute<void>>();

  static Future<T?> jumpToPage<T extends Object?>(
    BuildContext context,
    WidgetBuilder? builder, {
    bool removeAllHistroy = false,
  }) {
    if (removeAllHistroy) {
      return Navigator.pushAndRemoveUntil(
        context,
        platformPageRoute(
          context: context,
          builder: builder,
        ),
        (Route<dynamic> route) => false,
      );
    } else {
      return Navigator.push(
        context,
        platformPageRoute(
          context: context,
          builder: builder,
        ),
      );
    }
  }

  static Future<T?> showBottomSheet<T extends Object?>(
    BuildContext context,
    WidgetBuilder builder,
  ) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      backgroundColor: Colors.transparent,
      builder: builder,
    );
  }

  static void jumpToAboutPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => AboutPage(),
    );
  }

  static void jumpToSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SettingsPage(),
    );
  }

  static void jumpToPersonalizationSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => PersonalizationSettingsPage(),
    );
  }

  static void jumpToWorkspaceSettingsPage(
    BuildContext context,
    RustWorkspaceData workspace,
  ) {
    jumpToPage(
      context,
      (context) => WorkspaceSettingsPage(
        workspace: workspace,
      ),
    );
  }

  static void jumpToSelectWorkspacePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SelectWorkspacePage(),
      removeAllHistroy: true,
    );
  }

  static void jumpToWorkspaceHomePage(
    BuildContext context,
    RustWorkspaceData workspace,
  ) {
    jumpToPage(
      context,
      (context) => WorkspaceHomePage(
        workspace: workspace,
      ),
      removeAllHistroy: true,
    );
  }

  static Future<T?> showEditSheet<T>(
    BuildContext context,
    String title, {
    double? desiredHeight,
    String? initValue,
    String? finishBtnText,
    String? inputHintText,
    bool? autofocus,
    void Function(String value)? onFinish,
    String? Function(String?)? validator,
  }) {
    return AppRouter.showBottomSheet(
      context,
      (context) => EditSheet(
        isPage: false,
        title: title,
        desiredHeight: desiredHeight,
        initValue: initValue,
        finishBtnText: finishBtnText,
        inputHintText: inputHintText,
        autofocus: autofocus,
        onFinish: onFinish,
        validator: validator,
      ),
    );
  }

  static Future<T?> showSelectSheet<T>(
    BuildContext context, {
    required int currentSortType,
    required void Function(int sortType) onChange,
    required List<SelectItem> sortTypes,
    String? title,
  }) {
    return AppRouter.showBottomSheet(
      context,
      (context) => SelectSheet(
        title: title,
        currentSortType: currentSortType,
        onChange: onChange,
        sortTypes: sortTypes,
      ),
    );
  }
}
