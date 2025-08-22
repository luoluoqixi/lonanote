import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:lonanote/src/common/log.dart';

class CustomWebviewController {
  bool Function()? _isLoaded;
  Future<dynamic>? Function(String)? _executeJavaScript;
  Future<void>? Function(String)? _loadUrl;
  Future<void>? Function(String)? _loadFile;
  Future<void>? Function()? _reload;
  Function(String, Function(List<dynamic>))? _addJavaScriptHandler;
  void Function()? _disableKeyboard;
  void Function()? _enableKeyboard;
  void Function()? _hideKeyboard;
  void Function()? _dispose;

  void _bindIsLoaded(bool Function() callback) {
    _isLoaded = callback;
  }

  bool isLoaded() {
    return _isLoaded?.call() ?? false;
  }

  void _bindExecuteJavaScript(Future<dynamic>? Function(String) callback) {
    _executeJavaScript = callback;
  }

  Future<dynamic> executeJavaScript(String code) async {
    return _executeJavaScript?.call(code);
  }

  void _bindLoadUrl(Future<void>? Function(String) callback) {
    _loadUrl = callback;
  }

  Future<void>? loadUrl(String url) async {
    return _loadUrl?.call(url);
  }

  void _bindLoadFile(Future<void>? Function(String) callback) {
    _loadFile = callback;
  }

  Future<void> loadFile(String filePath) async {
    return _loadFile?.call(filePath);
  }

  void _bindReload(Future<void>? Function() callback) {
    _reload = callback;
  }

  Future<void> reload() async {
    return _reload?.call();
  }

  void _bindAddJavaScriptHandler(
      Function(String, Function(List<dynamic>)) callback) {
    _addJavaScriptHandler = callback;
  }

  void addJavaScriptHandler(
      String handlerName, Function(List<dynamic>) callback) {
    _addJavaScriptHandler?.call(handlerName, callback);
  }

  void _bindDisableKeyboard(Function() callback) {
    _disableKeyboard = callback;
  }

  void disableKeyboard() async {
    _disableKeyboard?.call();
  }

  void _bindEnableKeyboard(Function() callback) {
    _enableKeyboard = callback;
  }

  void enableKeyboard() async {
    _enableKeyboard?.call();
  }

  void _bindHideKeyboard(Function() callback) {
    _hideKeyboard = callback;
  }

  void hideKeyboard() async {
    _hideKeyboard?.call();
  }

  void _bindDispose(Function() callback) {
    _dispose = callback;
  }

  void dispose() {
    _dispose?.call();
  }
}

class CustomWebview extends StatefulWidget {
  final CustomWebviewController controller;

  final void Function()? onWebviewCreate;
  final void Function()? onLoadFinish;
  final void Function(int x, int y)? onScrollChanged;

  const CustomWebview({
    super.key,
    required this.controller,
    this.onWebviewCreate,
    this.onLoadFinish,
    this.onScrollChanged,
  });

  @override
  State<StatefulWidget> createState() => _CustomWebviewState();
}

class _CustomWebviewState extends State<CustomWebview> {
  InAppWebViewController? _webviewController;
  final GlobalKey webViewKey = GlobalKey();
  bool _webViewLoaded = false;

  final InAppWebViewSettings _webviewSettings = InAppWebViewSettings(
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
    widget.controller._bindIsLoaded(() => _webViewLoaded);
    widget.controller._bindExecuteJavaScript(_executeJavaScript);
    widget.controller._bindLoadUrl(_loadUrl);
    widget.controller._bindLoadFile(_loadFile);
    widget.controller._bindReload(_reload);
    widget.controller._bindAddJavaScriptHandler(_addJavaScriptHandler);
    widget.controller._bindDisableKeyboard(_disableKeyboard);
    widget.controller._bindEnableKeyboard(_enableKeyboard);
    widget.controller._bindHideKeyboard(_hideKeyboard);
    widget.controller._bindDispose(_dispose);
  }

  Future<dynamic>? _executeJavaScript(String code) {
    if (!_webViewLoaded) return null;
    if (_webviewController != null) {
      return _webviewController!.evaluateJavascript(source: code);
    }
    return null;
  }

  Future<void>? _loadUrl(String url) {
    if (_webviewController != null) {
      return _webviewController?.loadUrl(
        urlRequest: URLRequest(
          url: WebUri(url),
        ),
      );
    }
    return null;
  }

  Future<void>? _loadFile(String filePath) {
    if (_webviewController != null) {
      return _webviewController?.loadFile(assetFilePath: filePath);
    }
    return null;
  }

  Future<void>? _reload() {
    if (_webviewController != null) {
      return _webviewController?.reload();
    }
    return null;
  }

  void _addJavaScriptHandler(
    String handlerName,
    Function(List<dynamic>) callback,
  ) {
    if (_webviewController != null) {
      _webviewController!.addJavaScriptHandler(
        handlerName: handlerName,
        callback: callback,
      );
    }
  }

  void _disableKeyboard() {
    if (Platform.isIOS) {
      _webviewController?.setInputMethodEnabled(false);
    } else {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    }
  }

  void _enableKeyboard() {
    if (Platform.isIOS) {
      _webviewController?.setInputMethodEnabled(true);
    } else {
      SystemChannels.textInput.invokeMethod('TextInput.show');
      _webviewController?.requestFocus();
    }
  }

  void _hideKeyboard() {
    if (Platform.isAndroid) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    } else if (Platform.isIOS) {
      _webviewController?.evaluateJavascript(
          source: "document.activeElement?.blur()");
    }
  }

  void _dispose() {
    _webviewController?.dispose();
    _webviewController = null;
    _webViewLoaded = false;
  }

  Widget buildInappWebview() {
    return InAppWebView(
      key: webViewKey,
      initialSettings: _webviewSettings,
      onWebViewCreated: (controller) {
        _webviewController = controller;
        if (Platform.isIOS) {
          // 禁用 ios 弹出键盘时的自动滚动
          _webviewController!.disableAutoScrollWhenKeyboardShows(true);
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
        widget.onScrollChanged?.call(x, y);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return buildInappWebview();
  }
}
