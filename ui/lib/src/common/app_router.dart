import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/views/editor/editor_page.dart';
import 'package:lonanote/src/views/editor/image_view_page.dart';
import 'package:lonanote/src/views/editor/not_support_file_page.dart';
import 'package:lonanote/src/views/editor/video_view_page.dart';
import 'package:lonanote/src/views/settings/about_page.dart';
import 'package:lonanote/src/views/settings/personalization_settings_page.dart';
import 'package:lonanote/src/views/settings/settings_page.dart';
import 'package:lonanote/src/views/settings/workspace_settings_page.dart';
import 'package:lonanote/src/views/workspace/select_workspace_page.dart';
import 'package:lonanote/src/views/workspace/workspace_home_page.dart';
import 'package:lonanote/src/widgets/tools/edit_sheet.dart';
import 'package:lonanote/src/widgets/tools/list_sheet.dart';
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
    Color? barrierColor,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: isScrollControlled,
      isDismissible: isDismissible,
      showDragHandle: showDragHandle,
      backgroundColor: Colors.transparent,
      barrierColor: barrierColor,
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

  static void jumpToImageViewPage(
    BuildContext context,
    List<String> paths,
    int index,
  ) {
    jumpToPage(
      context,
      (context) => ImageViewPage(
        paths: paths,
        index: index,
      ),
      pageName: "/image_view",
    );
  }

  static void jumpToVideoViewPage(
    BuildContext context,
    String path,
  ) {
    jumpToPage(
      context,
      (context) => VideoViewPage(
        path: path,
      ),
      pageName: "/video_view",
    );
  }

  static void jumpToEditorPage(
    BuildContext context,
    String path,
  ) {
    jumpToPage(
      context,
      (context) => EditorPage(
        path: path,
      ),
      pageName: "/editor",
    );
  }

  static void jumpToNotSupportFilePage(BuildContext context, String path) {
    jumpToPage(
      context,
      (context) => NotSupportFilePage(path: path),
      pageName: "/not_support_file",
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
    final Color? barrierColor,
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
    return AppRouter.showBottomSheet(
      context,
      builder,
      pageName: pageName,
      barrierColor: barrierColor,
    );
  }

  static Future<T?> showSelectSheet<T>(
    BuildContext context, {
    required final String pageName,
    required final int currentValue,
    required final void Function(int value) onChange,
    required final List<SelectSheetItem> items,
    final String? title,
    final double? desiredHeight,
    final Color? barrierColor,
  }) {
    return AppRouter.showBottomSheet(
      context,
      (context) => SelectSheet(
        title: title,
        currentValue: currentValue,
        onChange: onChange,
        items: items,
        desiredHeight: desiredHeight,
      ),
      pageName: pageName,
      barrierColor: barrierColor,
    );
  }

  static Future<T?> showListSheet<T>(
    BuildContext context, {
    required final String pageName,
    required final void Function(int value) onChange,
    required final List<ListSheetItem> items,
    final String? title,
    final double? desiredHeight,
    final Color? barrierColor,
    final bool? galleryMode,
    final int? galleryRowCount,
  }) {
    return AppRouter.showBottomSheet(
      context,
      (context) => ListSheet(
        title: title,
        onChange: onChange,
        items: items,
        desiredHeight: desiredHeight,
        galleryMode: galleryMode,
        galleryRowCount: galleryRowCount,
      ),
      pageName: pageName,
      barrierColor: barrierColor,
    );
  }

  static void _openImage(BuildContext context, String rawPath) {
    List<String> list = [];
    var index = 0;
    final dir = Utility.getBasePath(rawPath);
    final files = RustFs.getFileList(dir);
    if (files != null) {
      final count = files.length;
      for (var i = 0; i < count; i++) {
        final f = files[i];
        final extName = Utility.getExtName(f);
        if (extName == null) continue;
        if (Utility.isImage(extName)) {
          if (f == rawPath) {
            index = list.length;
          }
          list.add(f);
        }
      }
    }
    AppRouter.jumpToImageViewPage(context, list, index);
  }

  static void _openVideo(BuildContext context, String rawPath) {
    AppRouter.jumpToVideoViewPage(context, rawPath);
  }

  static void _openEditor(BuildContext context, String path) {
    AppRouter.jumpToEditorPage(context, path);
  }

  static void _openNotSupport(BuildContext context, String rawPath) {
    AppRouter.jumpToNotSupportFilePage(context, rawPath);
  }

  static void openFile(BuildContext context, String fullPath, String path) {
    final extName = Utility.getExtName(path);
    final rawPath = fullPath;
    if (extName == null) {
      _openNotSupport(context, rawPath);
      return;
    }
    if (Utility.isImage(extName)) {
      _openImage(context, rawPath);
    } else if (Utility.isVideo(extName)) {
      _openVideo(context, rawPath);
    } else if (Utility.isSupportEditor(extName)) {
      _openEditor(context, path);
    } else {
      _openNotSupport(context, rawPath);
      return;
    }
  }
}
