import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/widgets/webview/custom_webview.dart';
import 'package:mime/mime.dart';

final isMobile = AppConfig.isMobile;

class CustomAnyPathHandler extends CustomPathHandler {
  final String directory;

  CustomAnyPathHandler({required super.path, required this.directory});

  @override
  Future<WebResourceResponse?> handle(String path) async {
    try {
      final fullPath = "$directory/$path";
      // logger.i("CustomAnyPathHandler handle: $fullPath");
      if (RustFs.exists(fullPath)) {
        final data = RustFs.readBinary(fullPath);
        return WebResourceResponse(
          contentType: lookupMimeType(path),
          data: Uint8List.fromList(data),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        logger.e(e);
      }
    }
    return WebResourceResponse(data: null);
  }
}

class CustomWebviewInApp extends StatefulWidget {
  final CustomWebviewController controller;

  final bool? assetAndroidHandlerEnable;
  final String? assetAndroidDomain;
  final String? assetAndroidPrefix;
  final String? assetAndroidDirectory;
  final String? assetScheme;
  final String? assetSchemeBaseDirectory;

  final void Function()? onWebviewCreate;
  final void Function()? onLoadFinish;
  final void Function(double x, double y)? onScrollChanged;

  const CustomWebviewInApp({
    super.key,
    required this.controller,
    this.onWebviewCreate,
    this.onLoadFinish,
    this.onScrollChanged,
    this.assetAndroidHandlerEnable,
    this.assetAndroidDomain,
    this.assetAndroidPrefix,
    this.assetAndroidDirectory,
    this.assetScheme,
    this.assetSchemeBaseDirectory,
  });

  @override
  State<StatefulWidget> createState() => _CustomWebviewInAppState();
}

class _CustomWebviewInAppState extends State<CustomWebviewInApp> {
  InAppWebViewController? _controller;

  final GlobalKey webViewKey = GlobalKey();
  bool _webViewLoaded = false;

  late final String assetScheme;

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
    allowFileAccess: false,
    allowFileAccessFromFileURLs: false,
    allowUniversalAccessFromFileURLs: false,
    allowContentAccess: false,
    domStorageEnabled: true,
    databaseEnabled: true,
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
    widget.controller.bindHasFocus(_hasFocus);
    widget.controller.bindClearFocus(_clearFocus);
    widget.controller.bindRequestFocus(_requestFocus);
    widget.controller.bindDispose(_dispose);
    assetScheme = widget.assetScheme ?? "assets";
    _webviewSettings.resourceCustomSchemes = [assetScheme];
    if (Platform.isAndroid && widget.assetAndroidHandlerEnable == true) {
      _createAssetLoader();
    }
  }

  void _dispose() {
    _controller?.dispose();
    _controller = null;
    _webViewLoaded = false;
  }

  void _createAssetLoader() async {
    final assetDirectory =
        widget.assetAndroidDirectory ?? RustWorkspaceManager.getWorkspaceDir();
    _webviewSettings.webViewAssetLoader = WebViewAssetLoader(
      pathHandlers: [
        CustomAnyPathHandler(
          path: widget.assetAndroidPrefix ?? "/files/",
          directory: assetDirectory,
        ),
      ],
      domain: widget.assetAndroidDomain ?? "appassets.androidplatform.net",
      httpAllowed: true,
    );
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
    if (!isMobile) return;
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
    if (!isMobile) return;
    if (_controller != null) {
      if (Platform.isAndroid) {
        SystemChannels.textInput.invokeMethod('TextInput.hide');
      } else if (Platform.isIOS) {
        _controller!
            .evaluateJavascript(source: "document.activeElement?.blur()");
      }
    }
  }

  Future<bool> _hasFocus() async {
    if (!isMobile) return false;
    if (_controller != null) {
      final result = await _controller!
          .evaluateJavascript(source: "document.activeElement != null");
      return result == true;
    }
    return false;
  }

  Future<void> _clearFocus() async {
    if (!isMobile) return;
    if (_controller != null) {
      await _controller!.clearFocus();
    }
  }

  Future<void> _requestFocus() async {
    if (!isMobile) return;
    if (_controller != null) {
      await _controller!.requestFocus();
    }
  }

  FutureOr<CustomSchemeResponse?> _customSchemeHandler(
    InAppWebViewController controller,
    WebResourceRequest request,
  ) async {
    if (request.url.scheme == assetScheme) {
      final baseFolder = widget.assetSchemeBaseDirectory;
      request.url.forceToStringRawValue = true;
      final url = Uri.decodeFull(request.url.toString());
      // logger.i("Custom scheme request: $url");
      final filePath = url.replaceFirst("$assetScheme://", "");
      final fullPath = baseFolder != null ? "$baseFolder/$filePath" : filePath;
      if (RustFs.exists(fullPath)) {
        final data = await RustFs.readBinaryAsync(fullPath);
        return CustomSchemeResponse(
          contentType: lookupMimeType(fullPath) ?? "application/octet-stream",
          data: Uint8List.fromList(data),
        );
      } else {
        logger.e("File not found: $fullPath");
        return CustomSchemeResponse(
          data: Uint8List.fromList([]),
          contentType: "text/plain",
          contentEncoding: "utf-8",
        );
      }
    }
    return null;
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
      onLoadResourceWithCustomScheme: _customSchemeHandler,
    );
  }

  @override
  Widget build(BuildContext context) {
    return buildInappWebview();
  }
}
