
import 'package:flutter/widgets.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/views/settings/settings_page.dart';
import 'package:lonanote/src/views/workspace/create_workspace_page.dart';
import 'package:lonanote/src/views/workspace/workspace_home.dart';

class AppRouter {
  static Future<T?> jumpToPage<T extends Object?>(BuildContext context, WidgetBuilder? builder) {
    return Navigator.push(
      context,
      platformPageRoute(
        context: context,
        builder: builder,
      ),
    );
  }

  static void jumpToSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SettingsPage(),
    );
  }
  static void jumpToCreateWorkspacePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => CreateWorkspacePage(),
    );
  }

    static void jumpToWorkspaceHomePage(BuildContext context) {
    jumpToPage(
      context,
      (context) => WorkspaceHomePage(),
    );
  }
}
