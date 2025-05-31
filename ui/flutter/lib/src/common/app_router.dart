import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/views/settings/settings_page.dart';
import 'package:lonanote/src/views/workspace/create_workspace_page.dart';
import 'package:lonanote/src/views/workspace/rename_workspace_page.dart';
import 'package:lonanote/src/views/workspace/select_workspace_page.dart';
import 'package:lonanote/src/views/workspace/workspace_home.dart';

class AppRouter {
  static RouteObserver<ModalRoute<void>> routeObserver =
      RouteObserver<ModalRoute<void>>();

  static Future<T?> jumpToPage<T extends Object?>(
      BuildContext context, WidgetBuilder? builder,
      {bool removeAllHistroy = false}) {
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
      BuildContext context, WidgetBuilder builder) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      backgroundColor: Colors.transparent,
      builder: builder,
    );
  }

  static void showCreateWorkspacePage(BuildContext context) {
    showBottomSheet(
      context,
      (context) => CreateWorkspacePage(
        isPage: false,
      ),
    );
  }

  static void showRenameWorkspacePage(
      BuildContext context, RustWorkspaceMetadata workspace) {
    showBottomSheet(
      context,
      (context) => RenameWorkspacePage(
        workspace: workspace,
      ),
    );
  }

  static void jumpToSettingsPage(
    BuildContext context,
    RustWorkspaceData? workspace,
  ) {
    jumpToPage(
      context,
      (context) => SettingsPage(
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

  static void jumpToCreateWorkspacePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => CreateWorkspacePage(
        isPage: true,
      ),
    );
  }

  static void jumpToWorkspaceHomePage(
      BuildContext context, RustWorkspaceData workspace) {
    jumpToPage(
      context,
      (context) => WorkspaceHomePage(
        workspace: workspace,
      ),
      removeAllHistroy: true,
    );
  }
}
