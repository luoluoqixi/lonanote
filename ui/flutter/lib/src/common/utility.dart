import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class Utility {
  static showDialog({
    required BuildContext context,
    required String title,
    required String content,
    String? okText,
    String? cancelText,
    bool? Function()? onOkPressed,
    bool? Function()? onCancelPressed,
    bool? isDange,
  }) {
    return showPlatformDialog(
      context: context,
      builder: (_) => PlatformAlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Text(content),
        ),
        actions: <Widget>[
          if (cancelText != null)
            PlatformDialogAction(
              child: PlatformText(cancelText),
              onPressed: () {
                if (onCancelPressed?.call() == true) {
                  return;
                }
                Navigator.pop(context);
              },
            ),
          if (okText != null)
            PlatformDialogAction(
              cupertino: (context, platform) => CupertinoDialogActionData(
                isDestructiveAction: isDange,
              ),
              child: Text(
                okText,
                style: isDange == true && isMaterial(context)
                    ? const TextStyle(
                        color: Colors.red, backgroundColor: Colors.red)
                    : null,
              ),
              onPressed: () {
                if (onOkPressed?.call() == true) {
                  return;
                }
                Navigator.pop(context);
              },
            ),
        ],
      ),
    );
  }
}
