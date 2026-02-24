import 'dart:convert';
import 'dart:io';

// ignore: implementation_imports
import 'package:lonanote/src/widgets/webview/custom_webview.dart';
// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/webkit_proxy.dart';
// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/common/platform_webview.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

class CustomWebviewFlutter extends StatefulWidget {
  final CustomWebviewController controller;

  final void Function()? onWebviewCreate;
  final void Function()? onLoadFinish;
  final void Function(double x, double y)? onScrollChanged;

  const CustomWebviewFlutter({
    super.key,
    required this.controller,
    this.onWebviewCreate,
    this.onLoadFinish,
    this.onScrollChanged,
  });

  @override
  State<StatefulWidget> createState() => _CustomWebviewFlutterState();
}

class _CustomWebviewFlutterState extends State<CustomWebviewFlutter> {
  late WebViewController _controller;
  CustomWebkitProxy? _webkitProxy;
  Map<String, Function(dynamic)>? _jsHandlers;

  bool _webViewLoaded = false;

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
    _initWebViewFlutterController();
    _initWebViewFlutter();
  }

  void _dispose() {
    _webViewLoaded = false;
    if (_webkitProxy != null) {
      _webkitProxy!.dispose();
      _webkitProxy = null;
    }
  }

  void _initWebViewFlutterController() {
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      // iOS 使用 webKitProxy 强行获取 webview 实例
      _webkitProxy = CustomWebkitProxy("editor_webview");
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        // ignore: invalid_use_of_visible_for_testing_member
        webKitProxy: _webkitProxy!,
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }
    _controller = WebViewController.fromPlatformCreationParams(params);
  }

  void _initWebViewFlutter() async {
    final controller = _controller;
    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setHorizontalScrollBarEnabled(false);
    if (Platform.isAndroid) {
      await controller.setVerticalScrollBarEnabled(true);
      await controller.setOverScrollMode(WebViewOverScrollMode.always);
    } else if (Platform.isIOS) {
      await controller.setVerticalScrollBarEnabled(false);
      if (controller.platform.runtimeType == WebKitWebViewController) {
        final webview = _webkitProxy?.webViewInstance;
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

  Future<dynamic>? _executeJavaScript(String code, bool hasResult) async {
    if (!_webViewLoaded) return null;
    if (hasResult) {
      final s =
          (await _controller.runJavaScriptReturningResult(code)) as String?;
      if (s != null) {
        return jsonDecode(s);
      }
      return null;
    } else {
      return await _controller.runJavaScript(code);
    }
  }

  Future<void>? _loadUrl(String url) {
    return _controller.loadRequest(Uri.parse(url));
  }

  Future<void>? _loadFile(String filePath) {
    _controller.loadFlutterAsset(filePath);
    return null;
  }

  Future<void>? _reload() {
    return _controller.reload();
  }

  void _addJavaScriptHandler(
    String handlerName,
    Function(dynamic) callback,
  ) {
    _jsHandlers ??= {};
    _jsHandlers![handlerName] = callback;
  }

  void _disableKeyboard() {
    if (Platform.isIOS) {
      // _controller.setInputMethodEnabled(false);
    } else {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    }
  }

  void _enableKeyboard() {
    if (Platform.isIOS) {
      // _controller.setInputMethodEnabled(true);
    } else {
      SystemChannels.textInput.invokeMethod('TextInput.show');
      _controller.runJavaScript("window.focus();");
    }
  }

  void _hideKeyboard() {
    if (Platform.isAndroid) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    } else if (Platform.isIOS) {
      _controller.removeJavaScriptChannel("document.activeElement?.blur()");
    }
  }

  Widget buildWebViewFlutter() {
    return WebViewWidget(
      controller: _controller,
    );
  }

  @override
  Widget build(BuildContext context) {
    return buildWebViewFlutter();
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
