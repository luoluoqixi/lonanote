import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:pull_down_button/pull_down_button.dart';
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

  int _tapCount = 0;
  DateTime? _lastTapTime;

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
    _controller.setNavigationDelegate(
      NavigationDelegate(
        onPageFinished: (url) async {
          logger.i("load finish: $url");
        },
      ),
    );
    if (AppConfig.isDebug) {
      final ip = "http://${AppConfig.devServerIp}:${AppConfig.devServerPort}";
      logger.i("load $ip");
      await _controller.loadRequest(Uri.parse(ip));
      // await _controller.loadFlutterAsset('assets/editor/index.html');
    } else {
      logger.i("load index.html...");
      await _controller.loadFlutterAsset('assets/editor/index.html');
    }
  }

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _openVConsole() {
    _controller.runJavaScript("window.setupVConsole()");
  }

  void _onTitleTap() {
    if (AppConfig.isDebug) return;

    final now = DateTime.now();
    if (_lastTapTime == null ||
        now.difference(_lastTapTime!) > Duration(seconds: 2)) {
      _tapCount = 0;
    }

    _tapCount += 1;
    _lastTapTime = now;

    if (_tapCount >= 10) {
      _tapCount = 0;
      _openVConsole();
    }
  }

  List<Widget> _buildTitleActions(ColorScheme colorScheme) {
    return [
      PlatformPullDownButton(
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: "设置",
            onTap: _openSettings,
            icon: ThemeIcons.settings(context),
          ),
        ],
        buttonIcon: Icon(
          ThemeIcons.more(context),
          color: ThemeColors.getTextGreyColor(colorScheme),
          size: 28,
        ),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);

    return PlatformSimplePage(
      titleActions: _buildTitleActions(colorScheme),
      title: GestureDetector(
        onTap: _onTitleTap,
        child: Text(
          showName,
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      ),
      noScrollView: true,
      child: WebViewWidget(
        controller: _controller,
      ),
    );
  }
}
