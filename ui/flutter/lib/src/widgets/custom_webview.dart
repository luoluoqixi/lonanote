import 'dart:convert';
import 'dart:io';

// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/webkit_proxy.dart';
// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/common/platform_webview.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

enum CustomWebviewMode {
  inAppWebView,
  webViewFlutter,
}

class CustomWebviewController {
  bool Function()? _isLoaded;
  Future<dynamic>? Function(String, bool)? _executeJavaScript;
  Future<void>? Function(String)? _loadUrl;
  Future<void>? Function(String)? _loadFile;
  Future<void>? Function()? _reload;
  Function(String, Function(dynamic))? _addJavaScriptHandler;
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

  void _bindExecuteJavaScript(
      Future<dynamic>? Function(String, bool) callback) {
    _executeJavaScript = callback;
  }

  Future<dynamic> executeJavaScript(String code, {bool? hasResult}) async {
    return _executeJavaScript?.call(code, hasResult ?? false);
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

  void _bindAddJavaScriptHandler(Function(String, Function(dynamic)) callback) {
    _addJavaScriptHandler = callback;
  }

  void addJavaScriptHandler(String handlerName, Function(dynamic) callback) {
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

  final CustomWebviewMode mode;
  final void Function()? onWebviewCreate;
  final void Function()? onLoadFinish;
  final void Function(double x, double y)? onScrollChanged;

  const CustomWebview({
    super.key,
    required this.controller,
    required this.mode,
    this.onWebviewCreate,
    this.onLoadFinish,
    this.onScrollChanged,
  });

  @override
  State<StatefulWidget> createState() => _CustomWebviewState();
}

class _CustomWebviewState extends State<CustomWebview> {
  InAppWebViewController? _inappWebviewController;
  late WebViewController _webviewFlutterController;
  CustomWebkitProxy? _webviewFlutterWebkitProxy;

  Map<String, Function(dynamic)>? _jsHandlers;

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
    _initWebViewFlutterController();
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

    if (widget.mode == CustomWebviewMode.webViewFlutter) {
      _initWebViewFlutter();
    }
  }

  void _dispose() {
    _inappWebviewController?.dispose();
    _inappWebviewController = null;
    _webViewLoaded = false;
    if (_webviewFlutterWebkitProxy != null) {
      _webviewFlutterWebkitProxy!.dispose();
      _webviewFlutterWebkitProxy = null;
    }
  }

  void _initWebViewFlutterController() {
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      // iOS 使用 webKitProxy 强行获取 webview 实例
      _webviewFlutterWebkitProxy = CustomWebkitProxy("editor_webview");
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        // ignore: invalid_use_of_visible_for_testing_member
        webKitProxy: _webviewFlutterWebkitProxy!,
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }
    _webviewFlutterController =
        WebViewController.fromPlatformCreationParams(params);
  }

  void _initWebViewFlutter() async {
    final controller = _getFlutterController();
    if (controller == null) return;
    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setHorizontalScrollBarEnabled(false);
    if (Platform.isAndroid) {
      await controller.setVerticalScrollBarEnabled(true);
      await controller.setOverScrollMode(WebViewOverScrollMode.always);
    } else if (Platform.isIOS) {
      await controller.setVerticalScrollBarEnabled(false);
      if (controller.platform.runtimeType == WebKitWebViewController) {
        final webview = _webviewFlutterWebkitProxy?.webViewInstance;
        if (webview != null) {
          // 设置 iOS WebView 的滚动行为
          webview.scrollView.setBounces(false);
          webview.scrollView.setAlwaysBounceHorizontal(false);
          webview.scrollView.setAlwaysBounceVertical(false);
          // final nativeWebView = webview.nativeWebView;
        }
      }
    }
    controller.addJavaScriptChannel(
      'EditorBridge',
      onMessageReceived: _onFlutterWebViewMessageReceived,
    );
    controller.setOnScrollPositionChange((position) {
      if (widget.onScrollChanged != null) {
        final dpr = MediaQuery.of(context).devicePixelRatio;
        final logicalX = position.x / dpr;
        final logicalY = position.y / dpr;
        widget.onScrollChanged?.call(logicalX, logicalY);
      }
    });
    controller.setOnConsoleMessage((message) {
      if (message.level == JavaScriptLogLevel.info) {
        logger.i(message.message);
      } else if (message.level == JavaScriptLogLevel.warning) {
        logger.w(message.message);
      } else if (message.level == JavaScriptLogLevel.error) {
        logger.e(message.message);
      } else if (message.level == JavaScriptLogLevel.log) {
        logger.i(message.message);
      } else if (message.level == JavaScriptLogLevel.debug) {
        logger.d(message.message);
      }
    });
    await controller.setNavigationDelegate(
      NavigationDelegate(
        onPageFinished: (url) async {
          logger.i("load finish $url");
          if (!mounted) return;
          _webViewLoaded = true;
          if (widget.onLoadFinish != null) {
            widget.onLoadFinish!();
          }
        },
      ),
    );
    if (widget.onWebviewCreate != null) {
      widget.onWebviewCreate!();
    }
  }

  void _onFlutterWebViewMessageReceived(JavaScriptMessage message) {
    final messageObject = jsonDecode(message.message) as Map<String, dynamic>;
    final command = messageObject['command'];
    if (_jsHandlers != null && _jsHandlers!.containsKey(command)) {
      _jsHandlers![command]!(messageObject['data']);
    }
  }

  InAppWebViewController? _getInappController() {
    if (widget.mode == CustomWebviewMode.inAppWebView) {
      return _inappWebviewController;
    }
    return null;
  }

  WebViewController? _getFlutterController() {
    if (widget.mode == CustomWebviewMode.webViewFlutter) {
      return _webviewFlutterController;
    }
    return null;
  }

  Future<dynamic>? _executeJavaScript(String code, bool hasResult) async {
    if (!_webViewLoaded) return null;
    if (_getInappController() != null) {
      final controller = _getInappController()!;
      return await controller.evaluateJavascript(source: code);
    }
    if (_getFlutterController() != null) {
      final controller = _getFlutterController()!;
      if (hasResult) {
        final s =
            (await controller.runJavaScriptReturningResult(code)) as String?;
        if (s != null) {
          return jsonDecode(s);
        }
        return null;
      } else {
        return await controller.runJavaScript(code);
      }
    }
    return null;
  }

  Future<void>? _loadUrl(String url) {
    if (_getInappController() != null) {
      return _getInappController()!.loadUrl(
        urlRequest: URLRequest(
          url: WebUri(url),
        ),
      );
    }
    if (_getFlutterController() != null) {
      return _getFlutterController()!.loadRequest(Uri.parse(url));
    }
    return null;
  }

  Future<void>? _loadFile(String filePath) {
    if (_getInappController() != null) {
      return _getInappController()?.loadFile(assetFilePath: filePath);
    }
    if (_getFlutterController() != null) {
      return _getFlutterController()?.loadFlutterAsset(filePath);
    }
    return null;
  }

  Future<void>? _reload() {
    if (_getInappController() != null) {
      return _getInappController()?.reload();
    }
    if (_getFlutterController() != null) {
      return _getFlutterController()?.reload();
    }
    return null;
  }

  void _addJavaScriptHandler(
    String handlerName,
    Function(dynamic) callback,
  ) {
    if (_getInappController() != null) {
      final controller = _getInappController()!;
      controller.addJavaScriptHandler(
        handlerName: handlerName,
        callback: (List<dynamic> arguments) {
          callback(arguments.isNotEmpty ? arguments[0] : null);
        },
      );
    } else if (_getFlutterController() != null) {
      _jsHandlers ??= {};
      _jsHandlers![handlerName] = callback;
    }
  }

  void _disableKeyboard() {
    if (_getInappController() != null) {
      final controller = _getInappController()!;
      if (Platform.isIOS) {
        controller.setInputMethodEnabled(false);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      }
    } else if (_getFlutterController() != null) {
      // final controller = _getFlutterController()!;
      if (Platform.isIOS) {
        // controller.setInputMethodEnabled(true);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      }
    }
  }

  void _enableKeyboard() {
    if (_getInappController() != null) {
      final controller = _getInappController()!;
      if (Platform.isIOS) {
        controller.setInputMethodEnabled(true);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.show');
        controller.requestFocus();
      }
    } else if (_getFlutterController() != null) {
      final controller = _getFlutterController()!;
      if (Platform.isIOS) {
        // controller.setInputMethodEnabled(true);
      } else {
        SystemChannels.textInput.invokeMethod('TextInput.show');
        controller.runJavaScript("window.focus();");
      }
    }
  }

  void _hideKeyboard() {
    if (_getInappController() != null) {
      final controller = _getInappController()!;
      if (Platform.isAndroid) {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      } else if (Platform.isIOS) {
        controller.evaluateJavascript(source: "document.activeElement?.blur()");
      }
    } else if (_getFlutterController() != null) {
      final controller = _getFlutterController()!;
      if (Platform.isAndroid) {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      } else if (Platform.isIOS) {
        controller.removeJavaScriptChannel("document.activeElement?.blur()");
      }
    }
  }

  Widget buildInappWebview() {
    return InAppWebView(
      key: webViewKey,
      initialSettings: _webviewSettings,
      onWebViewCreated: (controller) {
        _inappWebviewController = controller;
        if (Platform.isIOS) {
          // 禁用 ios 弹出键盘时的自动滚动
          _inappWebviewController!.disableAutoScrollWhenKeyboardShows(true);
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

  Widget buildWebViewFlutter() {
    return WebViewWidget(
      controller: _webviewFlutterController,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.mode == CustomWebviewMode.inAppWebView) {
      return buildInappWebview();
    } else {
      return buildWebViewFlutter();
    }
  }
}

class CustomWebkitProxy extends WebKitProxy {
  final String id;

  static final Map<String, PlatformWebView?> _webViewInstances = {};
  PlatformWebView? get webViewInstance => _webViewInstances[id];

  CustomWebkitProxy(this.id)
      : super(
          newPlatformWebView: ({required initialConfiguration, observeValue}) {
            final view = PlatformWebView(
              initialConfiguration: initialConfiguration,
              observeValue: observeValue,
            );
            _webViewInstances[id] = view;
            return view;
          },
        );

  void dispose() {
    _webViewInstances.remove(id);
  }
}
