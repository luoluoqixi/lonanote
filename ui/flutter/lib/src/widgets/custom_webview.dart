// import 'package:lonanote/src/widgets/custom_webview_flutter.dart';
// import 'package:lonanote/src/widgets/custom_webview_inapp.dart';

// import 'package:flutter/material.dart';

// enum CustomWebviewMode {
//   inAppWebView,
//   webViewFlutter,
// }

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
  Future<bool>? Function()? _hasFocus;
  Future<void>? Function()? _clearFocus;
  Future<void>? Function()? _requestFocus;
  void Function()? _dispose;

  void bindIsLoaded(bool Function() callback) {
    _isLoaded = callback;
  }

  void bindExecuteJavaScript(Future<dynamic>? Function(String, bool) callback) {
    _executeJavaScript = callback;
  }

  void bindLoadUrl(Future<void>? Function(String) callback) {
    _loadUrl = callback;
  }

  void bindLoadFile(Future<void>? Function(String) callback) {
    _loadFile = callback;
  }

  void bindReload(Future<void>? Function() callback) {
    _reload = callback;
  }

  void bindAddJavaScriptHandler(Function(String, Function(dynamic)) callback) {
    _addJavaScriptHandler = callback;
  }

  void bindDisableKeyboard(Function() callback) {
    _disableKeyboard = callback;
  }

  void bindEnableKeyboard(Function() callback) {
    _enableKeyboard = callback;
  }

  void bindHideKeyboard(Function() callback) {
    _hideKeyboard = callback;
  }

  void bindHasFocus(Future<bool>? Function() callback) {
    _hasFocus = callback;
  }

  void bindClearFocus(Future<void>? Function() callback) {
    _clearFocus = callback;
  }

  void bindRequestFocus(Future<void>? Function() callback) {
    _requestFocus = callback;
  }

  void bindDispose(Function() callback) {
    _dispose = callback;
  }

  bool isLoaded() {
    return _isLoaded?.call() ?? false;
  }

  Future<dynamic> executeJavaScript(String code, {bool? hasResult}) async {
    return _executeJavaScript?.call(code, hasResult ?? false);
  }

  Future<void>? loadUrl(String url) async {
    return _loadUrl?.call(url);
  }

  Future<void> loadFile(String filePath) async {
    return _loadFile?.call(filePath);
  }

  Future<void> reload() async {
    return _reload?.call();
  }

  void addJavaScriptHandler(String handlerName, Function(dynamic) callback) {
    _addJavaScriptHandler?.call(handlerName, callback);
  }

  void disableKeyboard() async {
    _disableKeyboard?.call();
  }

  void enableKeyboard() async {
    _enableKeyboard?.call();
  }

  void hideKeyboard() async {
    _hideKeyboard?.call();
  }

  Future<bool>? hasFocus() {
    return _hasFocus?.call();
  }

  Future<void> clearFocus() async {
    return _clearFocus?.call();
  }

  Future<void> requestFocus() async {
    return _requestFocus?.call();
  }

  void dispose() {
    _dispose?.call();
  }
}

// class CustomWebview extends StatelessWidget {
//   final CustomWebviewController controller;

//   final CustomWebviewMode mode;
//   final void Function()? onWebviewCreate;
//   final void Function()? onLoadFinish;
//   final void Function(double x, double y)? onScrollChanged;

//   const CustomWebview({
//     super.key,
//     required this.controller,
//     required this.mode,
//     this.onWebviewCreate,
//     this.onLoadFinish,
//     this.onScrollChanged,
//   });

//   @override
//   Widget build(BuildContext context) {
//     if (mode == CustomWebviewMode.inAppWebView) {
//       return CustomWebviewInApp(
//         controller: controller,
//         onWebviewCreate: onWebviewCreate,
//         onLoadFinish: onLoadFinish,
//         onScrollChanged: onScrollChanged,
//       );
//     } else {
//       return CustomWebviewFlutter(
//         controller: controller,
//         onWebviewCreate: onWebviewCreate,
//         onLoadFinish: onLoadFinish,
//         onScrollChanged: onScrollChanged,
//       );
//     }
//   }
// }
