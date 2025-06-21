import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
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
  bool _webViewLoaded = false;

  int _tapCount = 0;
  DateTime? _lastTapTime;

  String fileContent = "";

  @override
  void initState() {
    super.initState();
    _initEditorHtml();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateWebViewUI();
  }

  Future<void> _loadFileContent() async {
    try {
      final content = WorkspaceController.getFileContent(ref, widget.path);
      setState(() {
        fileContent = content;
      });
    } catch (e) {
      logger.e("load file error: $e");
      DialogTools.showDialog(
        context: context,
        title: "错误",
        content: LoggerUtility.errorShow("加载文件失败", e),
        okText: "确定",
      );
    }
  }

  Future<void> _initEditorHtml() async {
    await _loadFileContent();
    await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await _controller.clearCache();
    await _controller.setOnConsoleMessage((message) {
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
    await _controller.setNavigationDelegate(
      NavigationDelegate(
        onPageFinished: (url) async {
          logger.i("load finish: $url");
          if (!mounted) return;
          setState(() {
            _webViewLoaded = true;
          });
          await _updateWebViewUI();
          await _initWebEditor();
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

  void _refreshWebview() async {
    if (!_webViewLoaded) return;
    await _controller.reload();
  }

  void _openVConsole() {
    if (!_webViewLoaded) return;
    _controller.runJavaScript("window.setupVConsole()");
  }

  Future<void> _initWebEditor() async {
    if (_webViewLoaded) {
      await _controller
          .runJavaScript('window.initEditor(${jsonEncode(fileContent)})');
    }
  }

  Future<void> _updateWebViewUI() async {
    // 设置 webview 的背景颜色
    final bgColor = ThemeColors.getBgColor(ThemeColors.getColorScheme(context));
    await _controller.setBackgroundColor(bgColor);

    if (_webViewLoaded) {
      final brightness =
          WidgetsBinding.instance.platformDispatcher.platformBrightness;
      final theme = brightness == Brightness.dark ? 'dark' : 'light';
      await _controller.runJavaScript('window.setColorMode("$theme")');

      if (mounted) {
        final statusBarHeight = MediaQuery.of(context).padding.top;
        await _controller
            .runJavaScript('window.setStatusBarHeight("$statusBarHeight")');
      }
    }
  }

  void _onTitleTap() {
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
            title: "刷新",
            onTap: _refreshWebview,
            icon: ThemeIcons.refresh(context),
          ),
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
      extendBodyBehindAppBar: true,
      title: GestureDetector(
        onTap: _onTitleTap,
        child: Text(
          showName,
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      ),
      titleBgColor: Colors.transparent,
      centerTitle: true,
      noScrollView: true,
      child: WebViewWidget(
        controller: _controller,
      ),
    );
  }
}
