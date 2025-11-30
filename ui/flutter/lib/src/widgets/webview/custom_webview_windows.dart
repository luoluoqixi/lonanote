// import 'dart:async';
// import 'dart:io';

// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import 'package:webview_windows/webview_windows.dart';

// import 'package:lonanote/src/common/log.dart';
// import 'package:lonanote/src/widgets/webview/custom_webview.dart';
// import 'package:window_manager/window_manager.dart';

// final isWindows = Platform.isWindows;

// class CustomWebviewWindows extends StatefulWidget {
//   final CustomWebviewController controller;

//   final bool? assetAndroidHandlerEnable;
//   final String? assetAndroidDomain;
//   final String? assetAndroidPrefix;
//   final String? assetAndroidDirectory;
//   final String? assetScheme;
//   final String? assetSchemeBaseDirectory;

//   final void Function()? onWebviewCreate;
//   final void Function()? onLoadFinish;
//   final void Function(double x, double y)? onScrollChanged;

//   const CustomWebviewWindows({
//     super.key,
//     required this.controller,
//     this.onWebviewCreate,
//     this.onLoadFinish,
//     this.onScrollChanged,
//     this.assetAndroidHandlerEnable,
//     this.assetAndroidDomain,
//     this.assetAndroidPrefix,
//     this.assetAndroidDirectory,
//     this.assetScheme,
//     this.assetSchemeBaseDirectory,
//   });

//   @override
//   State<StatefulWidget> createState() => _CustomWebviewWindowsState();
// }

// class _CustomWebviewWindowsState extends State<CustomWebviewWindows> {
//   final _controller = WebviewController();
//   final _textController = TextEditingController();
//   final List<StreamSubscription> _subscriptions = [];

//   bool _webViewLoaded = false;

//   late final String assetScheme;

//   @override
//   void initState() {
//     super.initState();
//     widget.controller.bindIsLoaded(() => _webViewLoaded);
//     widget.controller.bindExecuteJavaScript(_executeJavaScript);
//     widget.controller.bindLoadUrl(_loadUrl);
//     widget.controller.bindLoadFile(_loadFile);
//     widget.controller.bindReload(_reload);
//     widget.controller.bindAddJavaScriptHandler(_addJavaScriptHandler);
//     widget.controller.bindDisableKeyboard(_disableKeyboard);
//     widget.controller.bindEnableKeyboard(_enableKeyboard);
//     widget.controller.bindHideKeyboard(_hideKeyboard);
//     widget.controller.bindHasFocus(_hasFocus);
//     widget.controller.bindClearFocus(_clearFocus);
//     widget.controller.bindRequestFocus(_requestFocus);
//     widget.controller.bindDispose(_dispose);
//     assetScheme = widget.assetScheme ?? "assets";

//     _initPlatformState();
//   }

//   void _dispose() {
//     _controller.dispose();
//     _webViewLoaded = false;
//   }

//   Future<void> _initPlatformState() async {
//     try {
//       final version = await WebviewController.getWebViewVersion();
//       logger.i("start init webview, version: $version");
//       await _controller.initialize();
//       _subscriptions.add(_controller.url.listen((url) {
//         _textController.text = url;
//       }));

//       _subscriptions
//           .add(_controller.containsFullScreenElementChanged.listen((flag) {
//         debugPrint('Contains fullscreen element: $flag');
//         windowManager.setFullScreen(flag);
//       }));

//       await _controller.setBackgroundColor(Colors.transparent);
//       await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);

//       logger.i("WebView initialized.");

//       _controller.onLoadError.listen((s) {
//         logger.e("WebView load error: $s");
//       });

//       if (!mounted) return;
//       setState(() {});

//       if (widget.onWebviewCreate != null) {
//         widget.onWebviewCreate!();
//       }
//     } on PlatformException catch (e) {
//       WidgetsBinding.instance.addPostFrameCallback((_) {
//         showDialog(
//             context: context,
//             builder: (_) => AlertDialog(
//                   title: Text('Error'),
//                   content: Column(
//                     mainAxisSize: MainAxisSize.min,
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       Text('Code: ${e.code}'),
//                       Text('Message: ${e.message}'),
//                     ],
//                   ),
//                   actions: [
//                     TextButton(
//                       child: Text('Continue'),
//                       onPressed: () {
//                         Navigator.of(context).pop();
//                       },
//                     )
//                   ],
//                 ));
//       });
//     }
//   }

//   Future<dynamic>? _executeJavaScript(String code, bool hasResult) async {
//     if (!_webViewLoaded) return null;
//     return _controller.executeScript(code);
//   }

//   Future<void>? _loadUrl(String url) {
//     return _controller.loadUrl(url);
//   }

//   Future<void>? _loadFile(String filePath) async {
//     await _controller.loadUrl("file:///$filePath");
//     _webViewLoaded = true;
//     if (widget.onLoadFinish != null) {
//       widget.onLoadFinish!();
//     }
//   }

//   Future<void>? _reload() {
//     return _controller.reload();
//   }

//   void _addJavaScriptHandler(
//     String handlerName,
//     Function(dynamic) callback,
//   ) {
//     // if (_controller != null) {
//     //   _controller!.addJavaScriptHandler(
//     //     handlerName: handlerName,
//     //     callback: (List<dynamic> arguments) {
//     //       callback(arguments.isNotEmpty ? arguments[0] : null);
//     //     },
//     //   );
//     // }
//   }

//   void _disableKeyboard() {
//     // if (_controller != null) {
//     //   final controller = _controller!;
//     //   if (Platform.isIOS) {
//     //     controller.setInputMethodEnabled(false);
//     //   } else {
//     //     SystemChannels.textInput.invokeMethod('TextInput.hide');
//     //   }
//     // }
//   }

//   void _enableKeyboard() {
//     // if (!isMobile) return;
//     // if (_controller != null) {
//     //   if (Platform.isIOS) {
//     //     _controller!.setInputMethodEnabled(true);
//     //   } else {
//     //     SystemChannels.textInput.invokeMethod('TextInput.show');
//     //     _controller!.requestFocus();
//     //   }
//     // }
//   }

//   void _hideKeyboard() {
//     // if (!isMobile) return;
//     // if (_controller != null) {
//     //   if (Platform.isAndroid) {
//     //     SystemChannels.textInput.invokeMethod('TextInput.hide');
//     //   } else if (Platform.isIOS) {
//     //     _controller!
//     //         .evaluateJavascript(source: "document.activeElement?.blur()");
//     //   }
//     // }
//   }

//   Future<bool> _hasFocus() async {
//     // if (!isMobile) return false;
//     // if (_controller != null) {
//     //   final result = await _controller!
//     //       .evaluateJavascript(source: "document.activeElement != null");
//     //   return result == true;
//     // }
//     return false;
//   }

//   Future<void> _clearFocus() async {
//     // if (!isMobile) return;
//     // if (_controller != null) {
//     //   await _controller!.clearFocus();
//     // }
//   }

//   Future<void> _requestFocus() async {
//     // if (!isMobile) return;
//     // if (_controller != null) {
//     //   await _controller!.requestFocus();
//     // }
//   }

//   Widget buildWebview() {
//     return Webview(
//       _controller,
//       permissionRequested: (url, permissionKind, isUserInitiated) async {
//         // logger.i(
//         //     "WebView permission requested: $url, $permissionKind, $isUserInitiated");
//         return WebviewPermissionDecision.allow;
//       },
//     );
//   }

//   @override
//   Widget build(BuildContext context) {
//     return buildWebview();
//   }
// }
