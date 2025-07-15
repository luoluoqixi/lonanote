import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
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
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:pull_down_button/pull_down_button.dart';

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
  static final double _defaultTitleHeight = 82.0;

  InAppWebViewController? _webViewController;
  final GlobalKey webViewKey = GlobalKey();

  InAppWebViewSettings settings = InAppWebViewSettings(
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
    alwaysBounceHorizontal: false,
    alwaysBounceVertical: true,
    verticalScrollBarEnabled: true,
    horizontalScrollBarEnabled: false,
    transparentBackground: true,
  );

  bool _webViewLoaded = false;
  bool _previewMode = false;
  late bool _sourceMode;
  late bool _isMarkdown;

  Color _titleBgColor = Colors.transparent;
  Color _titleTextColor = Colors.transparent;

  int _tapCount = 0;
  DateTime? _lastTapTime;

  double _titleOffset = 0.0;

  String fileContent = "";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final ext = Utility.getExtName(widget.path);
    _isMarkdown = ext != null && Utility.isMarkdown(ext);
    _sourceMode = !_isMarkdown;
  }

  @override
  void dispose() {
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

  Future<void> _initWebView() async {
    if (AppConfig.isDebug) {
      final ip = "http://${AppConfig.devServerIp}:${AppConfig.devServerPort}";
      await _webViewController?.loadUrl(
        urlRequest: URLRequest(
          url: WebUri(ip),
        ),
      );
      // await _webViewController?.loadFile(
      //   assetFilePath: 'assets/editor/index.html',
      // );
    } else {
      await _webViewController?.loadFile(
        assetFilePath: 'assets/editor/index.html',
      );
    }
  }

  void _bindMessageReceived() {
    if (_webViewController == null) return;
    _webViewController!.addJavaScriptHandler(
      handlerName: 'update_state',
      callback: (List<dynamic> arguments) {
        logger.i("update_state: $arguments");
        if (arguments.isNotEmpty) {
          final data = arguments[0];
          if (data != null) {
            final state = jsonDecode(data) as Map<String, dynamic>?;
            _updateState(state);
          }
        }
      },
    );
    _webViewController!.addJavaScriptHandler(
      handlerName: 'save_file',
      callback: (List<dynamic> arguments) {
        if (arguments.isNotEmpty) {
          final data = arguments[0];
          if (data != null) {
            final content = jsonDecode(data) as String?;
            _saveFile(content);
          }
        }
      },
    );
    _webViewController!.addJavaScriptHandler(
      handlerName: 'scroll_position',
      callback: (List<dynamic> arguments) {
        if (arguments.isNotEmpty) {
          final data = arguments[0];
          if (data != null) {
            final scrollY = jsonDecode(data) as num?;
            _onScrollPositionChange(scrollY?.toDouble());
          }
        }
      },
    );
    // _webViewController!.addJavaScriptHandler(
    //   handlerName: 'scrollable',
    //   callback: (List<dynamic> arguments) {
    //     if (arguments.isNotEmpty) {
    //       final data = arguments[0];
    //       if (data != null) {
    //         final obj = jsonDecode(data) as Map<String, dynamic>?;
    //         if (obj != null) {
    //           final scrollHeight = obj['scrollHeight'];
    //           final clientHeight = obj['clientHeight'];
    //           _onScrollHeightChange(
    //             scrollHeight?.toDouble(),
    //             clientHeight?.toDouble(),
    //           );
    //         }
    //       }
    //     }
    //   },
    // );
  }

  Color _getTitleColor(double scrollY, Color baseColor) {
    const maxOffset = 30.0;
    final minScrollY = _defaultTitleHeight - maxOffset;
    if (scrollY < minScrollY) {
      return Colors.transparent;
    }
    final offset = scrollY - minScrollY;
    final opacity = (offset / maxOffset).clamp(0.0, 1.0); // 0.0 ~ 1.0
    return baseColor.withAlpha(
      (255.0 * opacity).round(),
    );
  }

  // void _onHtmlScrollPositionChange(ScrollPositionChange position) {
  //   final dpr = MediaQuery.of(context).devicePixelRatio;
  //   final logicalY = position.y / dpr;
  //   _onScrollPositionChange(logicalY);
  // }

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

    final newOffset = scrollY > 0 ? -scrollY : 0.0;
    setState(() {
      _titleOffset = newOffset;
    });

    final colorScheme = ThemeColors.getColorScheme(context);
    final bgColor = ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);

    final newBgColor = _getTitleColor(scrollY, bgColor);
    final newTextColor = _getTitleColor(scrollY, textColor);

    _setAppBarColor(newBgColor, newTextColor);
  }

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
    await _webViewController?.reload();
    _resetAppBarColor();
  }

  Future<void> _save() async {
    final content = await _getContentCommand();
    _saveFile(content);
  }

  Future<String?> _getContentCommand() async {
    if (!_webViewLoaded) return null;
    final s = await _webViewController?.evaluateJavascript(
      source: "window.getContent()",
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
    _webViewController?.evaluateJavascript(source: "window.setupVConsole()");
  }

  Future<void> _initWebEditor() async {
    // if (!_webViewLoaded) return;
    await _webViewController?.evaluateJavascript(
      source: """
      (() => {
        const init = () => {
          if (window.initEditor) {
            try {
              window.initEditor("${widget.path}", $_sourceMode, ${jsonEncode(fileContent)});
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
    await _webViewController?.evaluateJavascript(
      source: """
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
      final t = ref.read(settingsProvider.notifier);
      final brightness = t.getResolveTheme();
      final theme = brightness == Brightness.dark ? 'dark' : 'light';
      await _webViewController?.evaluateJavascript(
        source: 'window.setColorMode("$theme", $updateEditor)',
      );
    }
  }

  Future<void> _updateWebViewUI() async {
    // 设置 webview 的背景颜色
    // final bgColor = ThemeColors.getBgColor(ThemeColors.getColorScheme(context));
    // await _controller.setBackgroundColor(bgColor);
    // await _controller.setBackgroundColor(Colors.transparent);

    if (_webViewLoaded) {
      final s = ref.read(settingsProvider.select((s) => s.settings));
      if (s != null) {
        final autoSave = s.autoSave;
        final autoSaveInterval = s.autoSaveInterval;
        final autoSaveFocusChange = s.autoSaveFocusChange;
        await _webViewController?.evaluateJavascript(
          source:
              'window.setAutoSave($autoSave, $autoSaveInterval, $autoSaveFocusChange)',
        );
      }
      await _updateColorMode(false);
      if (mounted) {
        final titleHeight = _defaultTitleHeight;
        await _webViewController?.evaluateJavascript(
            source: 'window.setTitleHeight($titleHeight)');
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
    return InAppWebView(
      key: webViewKey,
      initialSettings: settings,
      onWebViewCreated: (controller) {
        _webViewController = controller;
        _bindMessageReceived();
        _loadFileContent().then((_) {
          _initWebView();
        });
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
        await _updateWebViewUI();
        await _initWebEditor();
      },
      onReceivedError: (controller, request, error) {
        logger.e("WebView error: $error");
      },
      onReceivedHttpError: (controller, request, error) {
        logger.e("WebView HTTP error: $error");
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);
    // final mediaQuery = MediaQuery.of(context);
    // final height = mediaQuery.size.height - mediaQuery.viewInsets.bottom;
    final statusBarHeight = MediaQuery.of(context).padding.top;
    final titleHeight = _defaultTitleHeight + kToolbarHeight + statusBarHeight;

    return PlatformSimplePage(
      titleActions: _buildTitleActions(colorScheme),
      // 将 AppBar 背景延伸到屏幕顶部
      extendBodyBehindAppBar: true,
      // 如果不设置为 false, 键盘弹出与关闭时会显示 (0.x秒) 根 widget 的背景颜色
      // 相关问题：
      // https://github.com/flutter/flutter/issues/97054
      // https://github.com/flutter/flutter/issues/14288#issuecomment-361375791
      // 在键盘上方插入一个 Editor Toolbar 的 Widget, 应该可以解决此问题
      resizeToAvoidBottomInset: true,
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
          Transform.translate(
            offset: Offset(0, _titleOffset),
            child: SizedBox(
              child: Container(
                height: titleHeight,
                color: ThemeColors.getPrimaryColor(colorScheme),
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 20, left: 20),
                    child: Text(
                      showName,
                      style: TextStyle(
                        color: ThemeColors.getTextColor(colorScheme),
                        fontSize: 30,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Column(
            children: [
              AppBar(backgroundColor: Colors.transparent),
              Expanded(
                child: _buildWebView(colorScheme),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
