import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class DialogTools {
  static dialogAction(
    BuildContext context,
    String text, {
    bool? Function()? onPressed,
    bool isDange = false,
  }) {
    return PlatformDialogAction(
      cupertino: (context, platform) => CupertinoDialogActionData(
        isDestructiveAction: isDange,
      ),
      material: (context, platform) => MaterialDialogActionData(
        style: ButtonStyle(
          overlayColor: isDange == true
              ? WidgetStateProperty.all(
                  const Color.from(alpha: 0.2, red: 1.0, green: 0, blue: 0),
                )
              : null,
        ),
      ),
      child: Text(
        text,
        style: isDange == true && isMaterial(context)
            ? const TextStyle(
                color: Colors.red,
              )
            : null,
      ),
      onPressed: () {
        if (onPressed?.call() == true) {
          return;
        }
        Navigator.pop(context);
      },
    );
  }

  static showDialog({
    required BuildContext context,
    required String title,
    required String content,
    String? okText,
    String? cancelText,
    bool? Function()? onOkPressed,
    bool? Function()? onCancelPressed,
    List<Widget>? actions,
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
            dialogAction(context, cancelText, onPressed: onCancelPressed),
          if (okText != null)
            dialogAction(context, okText,
                onPressed: onOkPressed, isDange: isDange ?? false),
          ...?actions,
        ],
      ),
    );
  }
}
