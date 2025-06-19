import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:webview_flutter/webview_flutter.dart';

class EditorPage extends ConsumerStatefulWidget {
  const EditorPage({
    super.key,
    required this.path,
  });

  final String path;

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _EditorPageState();
}

class _EditorPageState extends ConsumerState<EditorPage> {
  final WebViewController _controller = WebViewController();

  @override
  void initState() {
    super.initState();
    initEditorHtml();
  }

  Future<void> initEditorHtml() async {
    await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    _controller.setOnConsoleMessage((message) {
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
    if (AppConfig.isDebug) {
      final ip = "http://${AppConfig.devServerIp}:${AppConfig.devServerPort}";
      logger.i("load $ip");
      // await _controller.loadRequest(Uri.parse(ip));
      await _controller.loadFlutterAsset('assets/editor/index.html');
      logger.i("load finish");
    } else {
      logger.i("load index.html...");
      await _controller.loadFlutterAsset('assets/editor/index.html');
      logger.i("load index.html finish");
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);

    return PlatformSimplePage(
      titleText: showName,
      noScrollView: true,
      child: WebViewWidget(
        controller: _controller,
      ),
    );
  }
}
