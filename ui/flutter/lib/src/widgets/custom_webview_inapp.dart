import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/widgets/custom_webview.dart';

class CustomWebviewInApp extends StatefulWidget {
  final CustomWebviewController controller;

  final void Function()? onWebviewCreate;
  final void Function()? onLoadFinish;
  final void Function(double x, double y)? onScrollChanged;

  const CustomWebviewInApp({
    super.key,
    required this.controller,
    this.onWebviewCreate,
    this.onLoadFinish,
    this.onScrollChanged,
  });

  @override
  State<StatefulWidget> createState() => _CustomWebviewInAppState();
}

class _CustomWebviewInAppState extends State<CustomWebviewInApp> {
  InAppWebViewController? _controller;

  final GlobalKey webViewKey = GlobalKey();
  bool _webViewLoaded = false;

  static final InAppWebViewSettings _webviewSettings = InAppWebViewSettings(
    isInspectable: kDebugMode,
    javaScriptEnabled: true,
    allowsBackForwardNavigationGestures: false,
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    supportZoom: false,
    contentInsetAdjustmentBehavior:
        ScrollViewContentInsetAdjustmentBehavior.NEVER,
    disableInputAccessoryView: true,
    disableVerticalScroll: false,
    disableHorizontalScroll: true,
    disallowOverScroll: false,
    alwaysBounceHorizontal: false,
    alwaysBounceVertical: true,
    verticalScrollBarEnabled: true,
    horizontalScrollBarEnabled: false,
    transparentBackground: true,
    overScrollMode: OverScrollMode.ALWAYS,
  );

  @override
  void initState() {
    super.initState();
    widget.controller.bindIsLoaded(() => _webViewLoaded);
    widget.controller.bindExecuteJavaScript(_executeJavaScript);
    widget.controller.bindLoadUrl(_loadUrl);
    widget.controller.bindLoadFile(_loadFile);
    widget.controller.bindReload(_reload);
    widget.controller.bindAddJavaScriptHandler(_addJavaScriptHandler);
    widget.controller.bindDisableKeyboard(_disableKeyboard);
    widget.controller.bindEnableKeyboard(_enableKeyboard);
    widget.controller.bindHideKeyboard(_hideKeyboard);
    widget.controller.bindDispose(_dispose);
  }

  void _dispose() {
    _controller?.dispose();
    _controller = null;
    _webViewLoaded = false;
  }

  Future<dynamic>? _executeJavaScript(String code, bool hasResult) async {
    if (!_webViewLoaded) return null;
    if (_controller != null) {
      return await _controller!.evaluateJavascript(source: code);
    }
    return null;
  }

  Future<void>? _loadUrl(String url) {
    if (_controller != null) {
      return _controller!.loadUrl(
        urlRequest: URLRequest(
          url: WebUri(url),
        ),
      );
    }
    return null;
  }

  Future<void>? _loadFile(String filePath) {
    if (_controller != null) {
      return _controller!.loadFile(assetFilePath: filePath);
    }
    return null;
  }

  Future<void>? _reload() {
    if (_controller != null) {
      return _controller!.reload();
    }
    return null;
  }

  void _addJavaScriptHandler(
    String handlerName,
    Function(dynamic) callback,
  ) {
    if (_controller != null) {
      _controller!.addJavaScriptHandler(
        handlerName: handlerName,
        callback: (List<dynamic> arguments) {
          callback(arguments.isNotEmpty ? arguments[0] : null);
        },
      );
    }
  }

  void _disableKeyboard() {
    if (_controller != null) {
      final controller = _controller!;
      if (Platform.isIOS) {
        controller.setInputMethodEnabled(false);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      }
    }
  }

  void _enableKeyboard() {
    if (_controller != null) {
      if (Platform.isIOS) {
        _controller!.setInputMethodEnabled(true);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.show');
        _controller!.requestFocus();
      }
    }
  }

  void _hideKeyboard() {
    if (_controller != null) {
      if (Platform.isAndroid) {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      } else if (Platform.isIOS) {
        _controller!
            .evaluateJavascript(source: "document.activeElement?.blur()");
      }
    }
  }

  Widget buildInappWebview() {
    return InAppWebView(
      key: webViewKey,
      initialSettings: _webviewSettings,
      onWebViewCreated: (controller) {
        _controller = controller;
        if (Platform.isIOS) {
          // 禁用 ios 弹出键盘时的自动滚动
          _controller!.disableAutoScrollWhenKeyboardShows(true);
        }
        if (widget.onWebviewCreate != null) {
          widget.onWebviewCreate!();
        }
      },
      onLoadStart: (controller, url) {
        logger.i("load $url...");
      },
      onPermissionRequest: (controller, request) async {
        logger.i("WebView permission request: $request");
        return PermissionResponse(
          resources: request.resources,
          action: PermissionResponseAction.GRANT,
        );
      },
      onLoadStop: (controller, url) async {
        logger.i("load finish $url");
        _webViewLoaded = true;

        if (widget.onLoadFinish != null) {
          widget.onLoadFinish!();
        }
      },
      onReceivedError: (controller, request, error) {
        logger.e("Webview Error: ${request.url} -> $error");
      },
      onReceivedHttpError: (controller, request, error) {
        logger.e(
            "HTTP Error: ${request.url} -> ${error.statusCode} ${error.reasonPhrase}");
      },
      onConsoleMessage: (controller, consoleMessage) {
        if (kDebugMode) {
          if (consoleMessage.messageLevel == ConsoleMessageLevel.LOG) {
            logger.i("WebView: ${consoleMessage.message}");
          } else if (consoleMessage.messageLevel == ConsoleMessageLevel.ERROR) {
            logger.e("WebView error: ${consoleMessage.message}");
          } else if (consoleMessage.messageLevel ==
              ConsoleMessageLevel.WARNING) {
            logger.w("WebView warning: ${consoleMessage.message}");
          } else {
            logger.d("WebView debug: ${consoleMessage.message}");
          }
        }
      },
      onScrollChanged: (controller, x, y) {
        widget.onScrollChanged?.call(x.toDouble(), y.toDouble());
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return buildInappWebview();
  }
}
