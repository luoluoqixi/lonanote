import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
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
    required String pageName,
    bool removeAllHistroy = false,
  }) {
    if (removeAllHistroy) {
      return Navigator.pushAndRemoveUntil(
        context,
        platformPageRoute(
          context: context,
          builder: builder,
          settings: RouteSettings(name: pageName),
        ),
        (Route<dynamic> route) => false,
      );
    } else {
      return Navigator.push(
        context,
        platformPageRoute(
          context: context,
          builder: builder,
          settings: RouteSettings(name: pageName),
        ),
      );
    }
  }

  static Future<T?> showBottomSheet<T extends Object?>(
    BuildContext context,
    WidgetBuilder builder, {
    required String pageName,
    bool isScrollControlled = true,
    bool isDismissible = true,
    bool showDragHandle = false,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: isScrollControlled,
      isDismissible: isDismissible,
      showDragHandle: showDragHandle,
      backgroundColor: Colors.transparent,
      builder: builder,
      routeSettings: RouteSettings(name: pageName),
    );
  }

  static void jumpToAboutPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => AboutPage(),
      pageName: "/about",
    );
  }

  static void jumpToSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SettingsPage(),
      pageName: "/settings",
    );
  }

  static void jumpToPersonalizationSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => PersonalizationSettingsPage(),
      pageName: "/personalization_settings",
    );
  }

  static void jumpToWorkspaceSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => WorkspaceSettingsPage(),
      pageName: "/workspace_settings",
    );
  }

  static void jumpToSelectWorkspacePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SelectWorkspacePage(),
      removeAllHistroy: true,
      pageName: "/select_workspace",
    );
  }

  static void jumpToWorkspaceHomePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => WorkspaceHomePage(),
      removeAllHistroy: true,
      pageName: "/workspace_home",
    );
  }

  static Future<T?> showEditSheet<T>(
    BuildContext context,
    String title, {
    required String pageName,
    final bool isPage = false,
    final double? desiredHeight,
    final String? initValue,
    final String? finishBtnText,
    final String? inputHintText,
    final bool? autofocus,
    final void Function(String value)? onFinish,
    final String? Function(String?)? validator,
    final bool? multilineInput,
    final String? customButtonText,
    final void Function(String value, bool Function() validate)?
        onCustomButtonTap,
  }) {
    builder(context) => EditSheet(
          isPage: isPage,
          title: title,
          desiredHeight: desiredHeight,
          initValue: initValue,
          finishBtnText: finishBtnText,
          inputHintText: inputHintText,
          autofocus: autofocus,
          onFinish: onFinish,
          validator: validator,
          multilineInput: multilineInput,
          customButtonText: customButtonText,
          onCustomButtonTap: onCustomButtonTap,
        );
    if (isPage) {
      return jumpToPage(
        context,
        builder,
        pageName: "/edit_sheet",
      );
    }
    return AppRouter.showBottomSheet(context, builder, pageName: pageName);
  }

  static Future<T?> showSelectSheet<T>(
    BuildContext context, {
    required String pageName,
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
      pageName: pageName,
    );
  }
}
