// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/webkit_proxy.dart';
// ignore: implementation_imports
import 'package:webview_flutter_wkwebview/src/common/platform_webview.dart';

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
