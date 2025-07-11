import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/app_theme.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/flutter/custom_webkit_proxy.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:pull_down_button/pull_down_button.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

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
    with WidgetsBindingObserver, RouteAware {
  /// 使用 body 滚动条, 如果为false, 则使用 editor 的滚动条
  static final _useBodyScrollbar = true;

  // final ScrollController _scrollController = ScrollController();
  late WebViewController _controller;
  CustomWebkitProxy? _webkitProxy;
  bool _webViewLoaded = false;
  bool _previewMode = false;
  late bool _sourceMode;
  late bool _isMarkdown;

  Color _titleBgColor = Colors.transparent;
  Color _titleTextColor = Colors.transparent;

  // bool _isLockWebScroll = false;
  // bool _isLockFlutterScroll = false;

  // Timer? _lockWebScrollTimer;
  // Timer? _lockFlutterScrollTimer;

  // double? _scrollHeight;
  // double? _clientHeight;

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
    _initController();
    _initEditorHtml();

    // _scrollController.addListener(_onFlutterScrollbarChanged);
  }

  @override
  void dispose() {
    _webkitProxy?.dispose();
    AppRouter.routeObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    AppRouter.routeObserver.subscribe(this, ModalRoute.of(context)!);
    _updateWebViewUI();
  }

  @override
  void didChangePlatformBrightness() {
    super.didChangePlatformBrightness();
    _updateColorMode(true);
  }

  @override
  void didPop() {
    final s = ref.read(settingsProvider.select((s) => s.settings));
    if (s != null && s.autoSaveFocusChange == true) {
      // 退出页面前保存文件
      _save();
    }
  }

  void _initController() {
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

  Future<void> _setIOSOverScrollMode() async {
    if (_controller.platform.runtimeType == WebKitWebViewController) {
      final webview = _webkitProxy?.webViewInstance;
      if (webview != null) {
        // 设置 iOS WebView 的滚动行为
        // 允许垂直方向的回弹效果, 禁止水平方向的回弹效果
        webview.scrollView.setBounces(true);
        webview.scrollView.setAlwaysBounceHorizontal(false);
        webview.scrollView.setAlwaysBounceVertical(true);
      }
    }
  }

  Future<void> _initEditorHtml() async {
    await _loadFileContent();
    await _controller.setHorizontalScrollBarEnabled(false);
    if (_useBodyScrollbar) {
      // 使用 body 滚动条时, 使用 flutter 自定义滚动条
      await _controller.setVerticalScrollBarEnabled(false);
    } else {
      await _controller.setVerticalScrollBarEnabled(true);
    }
    if (Platform.isIOS) {
      await _setIOSOverScrollMode();
    } else {
      await _controller.setOverScrollMode(WebViewOverScrollMode.always);
    }
    await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await _controller.clearCache();
    _controller.setOnScrollPositionChange(_onHtmlScrollPositionChange);
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
    } else if (command == 'scroll_position') {
      final num? scrollY = messageObject['scrollY'];
      _onScrollPositionChange(scrollY?.toDouble());
    } else if (command == "scrollable") {
      final scrollHeight = messageObject['scrollHeight'];
      final clientHeight = messageObject['clientHeight'];
      _onScrollHeightChange(scrollHeight?.toDouble(), clientHeight?.toDouble());
    }
  }

  Color _getTitleColor(double scrollY, Color baseColor) {
    final minScrollY = 150.0;
    if (scrollY < minScrollY) {
      return Colors.transparent;
    }
    final offset = scrollY - minScrollY;
    const maxOffset = 30.0;
    final opacity = (offset / maxOffset).clamp(0.0, 1.0); // 0.0 ~ 1.0
    return baseColor.withAlpha(
      (255.0 * opacity).round(),
    );
  }

  void _onHtmlScrollPositionChange(ScrollPositionChange position) {
    if (_useBodyScrollbar) {
      // _useBodyScrollbar 模式下, webview 是body在滚动, 和这个监听会重复调用
      return;
    }
    final dpr = MediaQuery.of(context).devicePixelRatio;
    final logicalY = position.y / dpr;
    _onScrollPositionChange(logicalY);
  }

  void _setAppBarColor(Color newBgColor, Color newTextColor) {
    if (newBgColor != _titleBgColor) {
      setState(() {
        _titleBgColor = newBgColor;
        _titleTextColor = newTextColor;
      });
    }
  }

  void _resetAppBarColor() {
    _setAppBarColor(Colors.transparent, Colors.transparent);
  }

  void _onScrollPositionChange(double? scrollY) {
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (scrollY == null) return;

    final colorScheme = ThemeColors.getColorScheme(context);
    final bgColor = ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);

    final newBgColor = _getTitleColor(scrollY, bgColor);
    final newTextColor = _getTitleColor(scrollY, textColor);

    _setAppBarColor(newBgColor, newTextColor);

    // if (_useBodyScrollbar && !_getIsLockFlutterScroll()) {
    //   _lockWebScroll();
    //   final maxScroll = (_scrollHeight ?? 0) - (_clientHeight ?? 0);
    //   _scrollController.jumpTo(scrollY.clamp(0, maxScroll));
    //   _unlockWebScroll();
    // }
  }

  void _onScrollHeightChange(double? scrollHeight, double? clientHeight) {
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (scrollHeight == null || clientHeight == null) return;
    // setState(() {
    //   _scrollHeight = scrollHeight;
    //   _clientHeight = clientHeight;
    // });
  }

  // bool _getIsLockWebScroll() {
  //   return _isLockWebScroll;
  // }

  // void _lockWebScroll() {
  //   if (_lockWebScrollTimer != null) {
  //     _lockWebScrollTimer!.cancel();
  //     _lockWebScrollTimer = null;
  //   }
  //   _isLockWebScroll = true;
  // }

  // void _unlockWebScroll() {
  //   _lockWebScrollTimer = Timer(Duration(milliseconds: 100), () {
  //     _lockWebScrollTimer = null;
  //     if (!mounted) return;
  //     _isLockWebScroll = false;
  //   });
  // }

  // bool _getIsLockFlutterScroll() {
  //   return _isLockFlutterScroll;
  // }

  // void _lockFlutterScroll() {
  //   if (_lockFlutterScrollTimer != null) {
  //     _lockFlutterScrollTimer!.cancel();
  //     _lockFlutterScrollTimer = null;
  //   }
  //   _isLockFlutterScroll = true;
  // }

  // void _unlockFlutterScroll() {
  //   _lockFlutterScrollTimer = Timer(Duration(milliseconds: 100), () {
  //     _lockFlutterScrollTimer = null;
  //     if (!mounted) return;
  //     _isLockFlutterScroll = false;
  //   });
  // }

  // void _setEditorScrollValue(double value) {
  //   if (!mounted) return;
  //   if (!_webViewLoaded) return;
  //   _controller.runJavaScript("window.setEditorScrollbarValue($value)");
  // }

  void _updateState(Map<String, dynamic>? state) {}

  void _saveFile(String? content) {
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (content == null) {
      logger.w("content is null, not saving file");
      return;
    }
    if (fileContent != content) {
      fileContent = content;
      // logger.i("content: $content");
      WorkspaceController.saveFileContent(ref, widget.path, content);
      logger.i("save file: ${content.length}");
    } else {
      logger.i("content not changed, not saving file");
    }
  }

  void _openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  void _refreshWebview() async {
    if (!_webViewLoaded) return;
    await _controller.reload();
    _resetAppBarColor();
  }

  Future<void> _save() async {
    final content = await _getContentCommand();
    _saveFile(content);
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
    _resetAppBarColor();
  }

  void _openVConsole() {
    if (!_webViewLoaded) return;
    _controller.runJavaScript("window.setupVConsole()");
  }

  Future<void> _initWebEditor() async {
    // if (!_webViewLoaded) return;
    await _controller.runJavaScript(
      """
      (() => {
        const init = () => {
          if (window.initEditor) {
            try {
              window.initEditor("${widget.path}", $_sourceMode, ${jsonEncode(fileContent)}, ${(!_useBodyScrollbar).toString()});
            } catch (e) {
              console.error('initEditor error:', e.message);
            }
          } else {
            setTimeout(init, 100);
          }
        };
        init();
      })();
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
        console.error('invokeComrror:', e);
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
    // final bgColor = ThemeColors.getBgColor(ThemeColors.getColorScheme(context));
    // await _controller.setBackgroundColor(bgColor);
    await _controller.setBackgroundColor(Colors.transparent);

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
    final theme = AppTheme.getPullDownMenuRouteThemeNoAlpha(context);
    return [
      // 如果 PullDown 下面是 webview, 背景会错误的变为透明
      // https://github.com/notDmDrl/pull_down_button/issues/28
      PlatformPullDownButton(
        routeTheme: theme,
        itemBuilder: (context) => [
          PullDownMenuItem(
            title: "保存",
            onTap: _save,
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

  Widget _buildWebView(ColorScheme colorScheme) {
    if (_useBodyScrollbar) {
      return Stack(
        children: [
          WebViewWidget(
            controller: _controller,
          ),
        ],
      );
    }
    return WebViewWidget(
      controller: _controller,
    );
  }

  // double _getAppBarMinHeight() {
  //   final paddingTop = MediaQuery.of(context).padding.top;
  //   return paddingTop + SimpleAppBar.defaultHeight;
  // }

  // double _getBottomPadding() {
  //   final paddingBottom = MediaQuery.of(context).padding.bottom;
  //   return paddingBottom;
  // }

  // void _onFlutterScrollbarChanged() {
  //   if (!_webViewLoaded) return;
  //   if (!_useBodyScrollbar) return;
  //   if (!_getIsLockWebScroll()) {
  //     _lockFlutterScroll();
  //     final value = _scrollController.offset;
  //     _controller.runJavaScript('window.scrollTo(0, $value)');
  //     _unlockFlutterScroll();
  //   }
  // }

  // Widget? _buildVirtualScrollbar() {
  //   if (_scrollHeight == null ||
  //       _clientHeight == null ||
  //       _scrollHeight! <= _clientHeight!) {
  //     return null;
  //   }

  //   const scrollbarWidth = 20.0;
  //   return Positioned(
  //     right: 0,
  //     top: 0,
  //     bottom: 0,
  //     child: SizedBox(
  //       height: _clientHeight,
  //       width: scrollbarWidth,
  //       child: PlatformScrollbar(
  //         controller: _scrollController,
  //         scrollPadding: EdgeInsets.only(
  //             top: _getAppBarMinHeight(), bottom: _getBottomPadding()),
  //         interactive: true,
  //         child: SingleChildScrollView(
  //           controller: _scrollController,
  //           // physics: const NeverScrollableScrollPhysics(),
  //           child: SizedBox(
  //             height: _scrollHeight,
  //             width: scrollbarWidth,
  //             child: Container(
  //               color: Colors.red.withAlpha(50),
  //             ),
  //           ),
  //         ),
  //       ),
  //     ),
  //   );
  // }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);
    // final scrollbar = _buildVirtualScrollbar();

    return PlatformSimplePage(
      titleActions: _buildTitleActions(colorScheme),
      // 将 AppBar 背景延伸到屏幕顶部
      extendBodyBehindAppBar: true,
      // 如果不设置为 false, 键盘弹出与关闭时会显示 (0.x秒) 根 widget 的背景颜色
      resizeToAvoidBottomInset: false,
      title: GestureDetector(
        onTap: _onTitleTap,
        child: Text(
          showName,
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      ),
      titleBgColor: _titleBgColor,
      titleTextColor: _titleTextColor,
      // 关闭滚动时 flutter 的 appbar 变色
      appbarScrolledUnderElevation: 0.0,
      centerTitle: true,
      noScrollView: true,
      child: Stack(
        children: [
          _buildWebView(colorScheme),
          // if (scrollbar != null) scrollbar,
        ],
      ),
    );
  }
}
