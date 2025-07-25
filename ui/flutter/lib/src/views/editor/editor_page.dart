import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
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
import 'package:lonanote/src/views/editor/editor_add_action.dart';
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
    with WidgetsBindingObserver, RouteAware, SingleTickerProviderStateMixin {
  static final double _defaultTitleHeight = 82.0;

  InAppWebViewController? _webViewController;
  final GlobalKey webViewKey = GlobalKey();

  final InAppWebViewSettings _webviewSettings = InAppWebViewSettings(
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
    disallowOverScroll: false,
    alwaysBounceHorizontal: false,
    alwaysBounceVertical: true,
    verticalScrollBarEnabled: true,
    horizontalScrollBarEnabled: false,
    transparentBackground: true,
    overScrollMode: OverScrollMode.ALWAYS,
  );

  bool _webViewLoaded = false;
  bool _previewMode = false;
  late bool _sourceMode;
  late bool _isMarkdown;

  bool _isSourceModeShowLine = false;

  Color _titleBgColor = Colors.transparent;
  Color _titleTextColor = Colors.transparent;

  int _tapCount = 0;
  DateTime? _lastTapTime;

  late final Ticker _ticker;
  bool _isPolling = false;
  Timer? _pollStopTimer;
  double _titleOffset = 0.0;

  bool _canRedo = false;
  bool _canUndo = false;

  bool _isDisposing = false;

  String fileContent = "";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final ext = Utility.getExtName(widget.path);
    _isMarkdown = ext != null && Utility.isMarkdown(ext);
    _sourceMode = !_isMarkdown;
    _ticker = createTicker(_onTick);

    _isSourceModeShowLine = ref
        .read(settingsProvider.select((s) => s.otherSettings))
        .showLineNumberInSourceMode;

    ref.listenManual<OtherSettings>(
        settingsProvider.select((s) => s.otherSettings), (previous, next) {
      if (!mounted) return;
      if (_isDisposing) return;
      if (previous?.showLineNumberInSourceMode !=
          next.showLineNumberInSourceMode) {
        _isSourceModeShowLine = next.showLineNumberInSourceMode;
        if (_sourceMode) {
          _refreshWebview();
        }
      }
    });
  }

  @override
  void dispose() {
    AppRouter.routeObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    _webViewController?.dispose();
    _webViewController = null;
    _ticker.dispose();
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
    SystemChannels.textInput.invokeMethod('TextInput.hide');
  }

  Future<bool> _onWillPop() async {
    setState(() {
      _isDisposing = true;
    });
    return true;
  }

  void _onTick(Duration duration) {
    // logger.i("Ticker tick: $duration");
    _pollTick();
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
        // logger.i("update_state: $arguments");
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
            // 直接使用 webviewController 的监听, 速度快很多
            // final scrollY = jsonDecode(data) as num?;
            // _onScrollPositionChange(scrollY?.toDouble());
          }
        }
      },
    );
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

  void _pollTick() {
    if (!_isPolling) return;
    if (!_webViewLoaded) return;
    if (_webViewController == null) return;
    if (!mounted) return;
    if (_isDisposing) return;
    _webViewController!.getScrollY().then((y) {
      if (y != null) {
        _onScrollPositionChange(y.toDouble());
      }
    });
  }

  void _onHtmlScrollPositionChange(int x, int y) {
    if (_isDisposing) return;
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (!_isPolling) {
      _ticker.start();
      _isPolling = true;
    }
    _onScrollPositionChange(y.toDouble());
    if (_pollStopTimer != null) {
      _pollStopTimer?.cancel();
      _pollStopTimer = null;
    }
    _pollStopTimer = Timer(Duration(milliseconds: 500), () {
      _pollStopTimer = null;
      _isPolling = false;
      _ticker.stop();
    });
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
    if (_isDisposing) return;
    if (!_webViewLoaded) return;
    if (!mounted) return;
    if (scrollY == null) return;

    late final double adjustedScrollY;
    if (Platform.isAndroid) {
      adjustedScrollY = scrollY / MediaQuery.of(context).devicePixelRatio;
    } else {
      adjustedScrollY = scrollY;
    }

    final newOffset =
        -adjustedScrollY; // adjustedScrollY > 0 ? -adjustedScrollY : 0.0;
    setState(() {
      _titleOffset = newOffset;
    });

    final colorScheme = ThemeColors.getColorScheme(context);
    final bgColor = ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);

    final newBgColor = _getTitleColor(adjustedScrollY, bgColor);
    final newTextColor = _getTitleColor(adjustedScrollY, textColor);

    _setAppBarColor(newBgColor, newTextColor);
  }

  void _updateState(Map<String, dynamic>? state) async {
    if (_isDisposing) return;
    if (!_webViewLoaded) return;
    if (!mounted) return;
    final canUndo = await _runWebCommandResult<bool>("can_undo", null);
    final canRedo = await _runWebCommandResult<bool>("can_redo", null);
    // logger.i("Update state: canUndo: $canUndo, canRedo: $canRedo");

    setState(() {
      _canUndo = canUndo ?? false;
      _canRedo = canRedo ?? false;
    });
  }

  void _undo() async {
    if (!_webViewLoaded) return;
    if (!_canUndo) return;
    HapticFeedback.mediumImpact();
    await _runWebCommand('undo', null);
  }

  void _redo() async {
    if (!_webViewLoaded) return;
    if (!_canRedo) return;
    HapticFeedback.mediumImpact();
    await _runWebCommand('redo', null);
  }

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
    if (Platform.isAndroid) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    } else if (Platform.isIOS) {}
  }

  void _openWorkspaceSettings() {
    AppRouter.jumpToWorkspaceSettingsPage(context);
    if (Platform.isAndroid) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    } else if (Platform.isIOS) {}
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
              window.initEditor("${widget.path}", $_sourceMode, $_isSourceModeShowLine, ${jsonEncode(fileContent)});
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

  Future<T?> _runWebCommandResult<T>(String command, dynamic data) async {
    if (!_webViewLoaded) return null;
    final dataStr = data == null ? "null" : jsonEncode(data);
    final result = await _webViewController?.evaluateJavascript(
      source: """
      (function() {
        try {
          return window.invokeCommand("$command", $dataStr);
        } catch(e) {
          console.error('invokeComrror:', e);
          return null;
        }
      })()
      """,
    );
    if (result == null) return null;
    return result as T;
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
    if (_isDisposing) return;
    if (_webViewController == null) return;
    if (!mounted) return;
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

  void _onTitleTap() async {
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

  void _onToolbarActionAdd() {
    HapticFeedback.mediumImpact();
    if (Platform.isAndroid) {
      SystemChannels.textInput.invokeMethod('TextInput.hide');
    } else if (Platform.isIOS) {}
    AppRouter.showListSheet(
      context,
      title: "添加",
      items: editorAddActionItems,
      onChange: (val) {
        if (_isDisposing) return;
        if (!mounted) return;
        if (!_webViewLoaded) return;
        if (_webViewController == null) return;
        _runWebCommand("add_markdown_action", val);
        Navigator.of(context).pop();
      },
      pageName: "/editor_add_action_sheet",
      barrierColor: Colors.transparent,
      galleryMode: true,
      galleryRowCount: 4,
    ).then((_) {
      if (Platform.isAndroid) {
        SystemChannels.textInput.invokeMethod('TextInput.show');
        _webViewController?.requestFocus();
      } else if (Platform.isIOS) {}
    });
  }

  List<Widget> _buildTitleActions(ColorScheme colorScheme) {
    final theme = AppTheme.getPullDownMenuRouteThemeNoAlpha(context);
    return [
      // IconButton(
      //   icon: Icon(ThemeIcons.undo(context)),
      //   tooltip: '撤销',
      //   onPressed: _canUndo ? _undo : null,
      // ),
      // IconButton(
      //   icon: Icon(ThemeIcons.redo(context)),
      //   tooltip: '重做',
      //   onPressed: _canRedo ? _redo : null,
      // ),
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
          PullDownMenuItem(
            title: "撤销",
            onTap: _canUndo ? _undo : null,
            icon: ThemeIcons.undo(context),
            enabled: _canUndo,
          ),
          PullDownMenuItem(
            title: "重做",
            onTap: _canRedo ? _redo : null,
            icon: ThemeIcons.redo(context),
            enabled: _canRedo,
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
            title: "工作区设置",
            onTap: _openWorkspaceSettings,
            icon: ThemeIcons.tune(context),
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
    if (_isDisposing) {
      return SizedBox.shrink();
    }
    return InAppWebView(
      key: webViewKey,
      initialSettings: _webviewSettings,
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
        logger.e("Webview Error: ${request.url} -> $error");
      },
      onReceivedHttpError: (controller, request, error) {
        logger.e(
            "HTTP Error: ${request.url} -> ${error.statusCode} ${error.reasonPhrase}");
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
      onScrollChanged: (controller, x, y) {
        _onHtmlScrollPositionChange(x, y);
      },
    );
  }

  Widget? _buildBottomBar(BuildContext context, MediaQueryData mediaQuery,
      ColorScheme colorScheme) {
    final bottom = mediaQuery.viewInsets.bottom;
    final bgColor = ThemeColors.getBgColor(colorScheme);

    return bottom > 20
        ? SizedBox(
            height: 45.0,
            child: Container(
              padding: EdgeInsets.only(
                left: 10,
                right: 10,
              ),
              decoration: BoxDecoration(
                color: bgColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(10),
                    blurRadius: 20.0,
                    spreadRadius: 10.0,
                    offset: Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      IconButton(
                        icon: Icon(ThemeIcons.add(context)),
                        onPressed: _onToolbarActionAdd,
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      IconButton(
                        icon: Icon(ThemeIcons.undo(context)),
                        tooltip: '撤销',
                        onPressed: _canUndo ? _undo : null,
                      ),
                      IconButton(
                        icon: Icon(ThemeIcons.redo(context)),
                        tooltip: '重做',
                        onPressed: _canRedo ? _redo : null,
                      ),
                      VerticalDivider(
                        indent: 8,
                        endIndent: 8,
                        thickness: 1,
                        width: 20,
                        color: Colors.grey.withAlpha(100),
                      ),
                      IconButton(
                        icon: Icon(ThemeIcons.keyboardHide(context)),
                        tooltip: '关闭键盘',
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          SystemChannels.textInput
                              .invokeMethod('TextInput.hide');
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          )
        : null;
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);
    final mediaQuery = MediaQuery.of(context);
    final statusBarHeight = mediaQuery.padding.top;
    final titleHeight = _defaultTitleHeight + kToolbarHeight + statusBarHeight;
    final bottomBar = _buildBottomBar(context, mediaQuery, colorScheme);

    return PlatformSimplePage(
      titleActions: _buildTitleActions(colorScheme),
      onWillPop: Platform.isAndroid ? _onWillPop : null,
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
          // AnimatedPositioned(
          //   top: _titleOffset,
          //   left: 0,
          //   right: 0,
          //   duration: Duration(milliseconds: 5),
          Transform.translate(
            offset: Offset(0, _titleOffset),
            child: SizedBox(
              child: Container(
                height: titleHeight,
                // 考虑增加背景颜色、图片调节设置
                // color: ThemeColors.getPrimaryColor(colorScheme),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      ThemeColors.getPrimaryColor(colorScheme),
                      ThemeColors.getBgColor(colorScheme),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
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
              Flexible(
                child: _buildWebView(colorScheme),
              ),
              if (bottomBar != null) bottomBar,
            ],
          ),
        ],
      ),
    );
  }
}
