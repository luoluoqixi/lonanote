import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
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
    await _controller.loadFlutterAsset('assets/editor/index.html');
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);

    return PlatformSimplePage(
      titleText: showName,
      noScrollView: true,
      child: WebViewWidget(controller: _controller),
    );
  }
}
