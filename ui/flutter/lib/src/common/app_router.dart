import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
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
    BuildContext context,
    WidgetBuilder builder, {
    double childSize = 0.5,
    double padding = 16.0,
    double? minChildSize,
    double? maxChildSize,
    bool? expand,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: DraggableScrollableSheet(
            initialChildSize: childSize,
            minChildSize: minChildSize ?? childSize,
            maxChildSize: maxChildSize ?? childSize,
            expand: expand ?? false,
            builder: (context, scrollController) {
              final colorScheme = Theme.of(context).colorScheme;
              return Container(
                decoration: BoxDecoration(
                  color: ThemeColors.getBgColor(colorScheme),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12.0),
                      child: Container(
                        width: 40,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.grey[400],
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.all(padding),
                        child: builder(context),
                      ),
                    )
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  static void showCreateWorkspacePage(BuildContext context) {
    showBottomSheet(
      context,
      (context) => CreateWorkspacePage(
        isPage: false,
      ),
      childSize: 0.4,
    );
  }

  static void showRenameWorkspacePage(
      BuildContext context, RustWorkspaceMetadata workspace) {
    showBottomSheet(
      context,
      (context) => RenameWorkspacePage(
        workspace: workspace,
      ),
      childSize: 0.4,
    );
  }

  static void jumpToSettingsPage(BuildContext context) {
    jumpToPage(
      context,
      (context) => SettingsPage(),
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
