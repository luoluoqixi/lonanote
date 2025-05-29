import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:intl/intl.dart';

class Utility {
  static String formatTimestamp(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
    final formatter = DateFormat('yyyy-MM-dd HH:mm:ss');
    return formatter.format(date);
  }

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
              material: (context, platform) => MaterialDialogActionData(
                style: ButtonStyle(
                  overlayColor: isDange == true
                      ? WidgetStateProperty.all(
                          const Color.from(
                              alpha: 0.2, red: 1.0, green: 0, blue: 0),
                        )
                      : null,
                ),
              ),
              child: Text(
                okText,
                style: isDange == true && isMaterial(context)
                    ? const TextStyle(
                        color: Colors.red,
                      )
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
