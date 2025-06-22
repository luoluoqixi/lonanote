import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
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

class _EditorPageState extends ConsumerState<EditorPage>
    with WidgetsBindingObserver {
  final WebViewController _controller = WebViewController();
  bool _webViewLoaded = false;
  bool _previewMode = false;
  late bool _sourceMode;
  late bool _isMarkdown;

  int _tapCount = 0;
  DateTime? _lastTapTime;

  String fileContent = "";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final ext = Utility.getExtName(widget.path);
    _isMarkdown = ext != null && Utility.isMarkdown(ext);
    _sourceMode = !_isMarkdown;
    _initEditorHtml();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateWebViewUI();
  }

  @override
  void didChangePlatformBrightness() {
    super.didChangePlatformBrightness();
    _updateColorMode(true);
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
    _controller.addJavaScriptChannel(
      'EditorBridge',
      onMessageReceived: _onMessageReceived,
    );
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
          _webViewLoaded = true;
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

  void _onMessageReceived(JavaScriptMessage message) {
    final messageObject = jsonDecode(message.message) as Map<String, dynamic>;
    final command = messageObject['command'];
    if (command == 'update_state') {
      _updateState(messageObject['state']);
    } else if (command == 'save_file') {
      _saveFile(messageObject['content']);
    }
  }

  void _updateState(Map<String, dynamic>? state) {}

  void _saveFile(String? content) {
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (content == null) return;
    fileContent = content;
    WorkspaceController.saveFileContent(ref, widget.path, content);
    logger.i("save file: ${content.length}");
  }

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _refreshWebview() async {
    if (!_webViewLoaded) return;
    await _controller.reload();
  }

  Future<void> _saveCommand() async {
    await _runWebCommand('save', null);
  }

  Future<String?> _getContentCommand() async {
    if (!_webViewLoaded) return null;
    final s = await _controller.runJavaScriptReturningResult(
      "window.getContent()",
    ) as String?;
    if (s != null) {
      return jsonDecode(s);
    }
    return null;
  }

  Future<void> _changeEditModeCommand() async {
    final targetPreviewMode = !_previewMode;
    setState(() {
      _previewMode = targetPreviewMode;
    });
    await _runWebCommand('change_preview_mode', targetPreviewMode);
  }

  Future<void> _toggleSourceMode() async {
    final targetSourceMode = !_sourceMode;
    setState(() {
      _sourceMode = targetSourceMode;
    });
    await _runWebCommand('change_source_mode', targetSourceMode);
  }

  void _openVConsole() {
    if (!_webViewLoaded) return;
    _controller.runJavaScript("window.setupVConsole()");
  }

  Future<void> _initWebEditor() async {
    // if (!_webViewLoaded) return;
    await _controller.runJavaScript(
      """
      try {
        window.initEditor("${widget.path}", $_sourceMode, ${jsonEncode(fileContent)});
      } catch(e) {
        console.error('initEditor error:', e);
      }
      """,
    );
  }

  Future<void> _runWebCommand(String command, dynamic data) async {
    if (!_webViewLoaded) return;
    final dataStr = data == null ? "null" : jsonEncode(data);
    await _controller.runJavaScript(
      """
      try {
        window.invokeCommand("$command", $dataStr);
      } catch(e) {
        console.error('invokeCommand error:', e);
      }
      """,
    );
  }

  Future<void> _updateColorMode(bool updateEditor) async {
    if (_webViewLoaded) {
      final brightness =
          WidgetsBinding.instance.platformDispatcher.platformBrightness;
      final theme = brightness == Brightness.dark ? 'dark' : 'light';
      await _controller
          .runJavaScript('window.setColorMode("$theme", $updateEditor)');
    }
  }

  Future<void> _updateWebViewUI() async {
    // 设置 webview 的背景颜色
    final bgColor = ThemeColors.getBgColor(ThemeColors.getColorScheme(context));
    await _controller.setBackgroundColor(bgColor);

    if (_webViewLoaded) {
      final s = ref.read(settingsProvider.select((s) => s.settings));
      if (s != null) {
        final autoSave = s.autoSave;
        final autoSaveInterval = s.autoSaveInterval;
        final autoSaveFocusChange = s.autoSaveFocusChange;
        await _controller.runJavaScript(
          'window.setAutoSave($autoSave, $autoSaveInterval, $autoSaveFocusChange)',
        );
      }
      await _updateColorMode(false);
      if (mounted) {
        final statusBarHeight = MediaQuery.of(context).padding.top;
        await _controller
            .runJavaScript('window.setStatusBarHeight($statusBarHeight)');
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
            title: "保存",
            onTap: _saveCommand,
            icon: ThemeIcons.save(context),
          ),
          PullDownMenuItem.selectable(
            title: "预览模式",
            onTap: _changeEditModeCommand,
            selected: _previewMode,
            icon: ThemeIcons.preview(context),
          ),
          PullDownMenuItem.selectable(
            title: "源码模式",
            onTap: _toggleSourceMode,
            selected: _sourceMode,
            enabled: _isMarkdown,
          ),
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

  void _onPopInvoked<T>(bool didPop, T result) async {
    final s = ref.read(settingsProvider.select((s) => s.settings));
    if (s != null && s.autoSaveFocusChange == true) {
      // 退出页面前保存文件
      final content = await _getContentCommand();
      _saveFile(content);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);

    return PopScope(
      onPopInvokedWithResult: _onPopInvoked,
      child: PlatformSimplePage(
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
      ),
    );
  }
}
