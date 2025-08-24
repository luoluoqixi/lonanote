import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/common/ws_utils.dart';
import 'package:lonanote/src/controller/settings/settings_controller.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/app_theme.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/views/editor/editor_toolbar/editor_add_toolbar.dart';
import 'package:lonanote/src/views/editor/editor_toolbar/editor_text_style_toolbar.dart';
import 'package:lonanote/src/widgets/custom_webview.dart';
import 'package:lonanote/src/widgets/custom_webview_inapp.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';
import 'package:pull_down_button/pull_down_button.dart';
import 'package:keyboard_height_plugin/keyboard_height_plugin.dart';

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
  final CustomWebviewController _webviewController = CustomWebviewController();

  bool _previewMode = false;
  late bool _sourceMode;
  late bool _isMarkdown;

  bool _isShowLineNumber = false;

  static const Color _defaultTitleBgColor = Colors.transparent;
  static const Color _defaultTitleTextColor = Colors.transparent;

  Color _titleBgColor = _defaultTitleBgColor;
  Color _titleTextColor = _defaultTitleTextColor;

  int _tapCount = 0;
  DateTime? _lastTapTime;

  bool _canRedo = false;
  bool _canUndo = false;

  bool _isDisposing = false;

  String fileContent = "";

  _EditorCustomToolbarType _showToolbarType = _EditorCustomToolbarType.none;

  bool _reShowKeyboard = false;
  bool _reHideKeyboard = false;
  bool _isShowKeyboard = false;
  double _currentkeyboardHeight = 0;
  double _openKeyboardHeight = 0;
  final KeyboardHeightPlugin _keyboardHeightPlugin = KeyboardHeightPlugin();

  static final double _toolbarHeight = 45.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _keyboardHeightPlugin.onKeyboardHeightChanged((double height) {
      if (!mounted) return;
      if (Platform.isAndroid) {
        if (height > 0) {
          height += MediaQuery.of(context).viewPadding.bottom;
        }
      }
      if (_currentkeyboardHeight != height) {
        // logger.i("keyboard height: $height");
        late bool targetShow;
        if (height > 0) {
          targetShow = true;
        } else {
          targetShow = false;
        }
        setState(() {
          _currentkeyboardHeight = height;
          if (_currentkeyboardHeight > 0) {
            _openKeyboardHeight = _currentkeyboardHeight;
          }
          if (targetShow != _isShowKeyboard) {
            _isShowKeyboard = targetShow;
            if (_isShowKeyboard && !_reHideKeyboard && !_reShowKeyboard) {
              _showToolbarType = _EditorCustomToolbarType.none;
            }
          }
        });
      }
    });

    final ext = Utility.getExtName(widget.path);
    _isMarkdown = ext != null && Utility.isMarkdown(ext);
    final settings = ref.read(settingsProvider.select((s) => s.settings));
    if (!_isMarkdown) {
      _sourceMode = false;
    } else {
      _sourceMode = settings?.sourceMode == true;
    }
    _isShowLineNumber = settings?.showLineNumber == true;
    ref.listenManual(settingsProvider.select((s) => s.settings),
        (previous, next) {
      if (!mounted) return;
      if (_isDisposing) return;
      if (previous?.showLineNumber != next?.showLineNumber ||
          previous?.sourceMode != next?.sourceMode) {
        _isShowLineNumber = next?.showLineNumber == true;
        if (_isMarkdown) {
          _sourceMode = next?.sourceMode == true;
        }
        _reinitEditor();
      }
    });
    ref.listenManual(settingsProvider.select((s) => s.theme), (previous, next) {
      if (!mounted) return;
      if (_isDisposing) return;
      var needUpdate = false;
      if (previous != null) {
        final theme = Settings.getResolveThemeFromThemeSettings(previous);
        final nextTheme = Settings.getResolveThemeFromThemeSettings(next);
        if (theme != nextTheme) {
          needUpdate = true;
        }
        if (previous.primaryColor != next.primaryColor) {
          needUpdate = true;
        }
      } else {
        needUpdate = true;
      }
      if (needUpdate) {
        _updateColorMode(true);
      }
    });
  }

  @override
  void dispose() {
    AppRouter.routeObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    _webviewController.dispose();
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
    if (Platform.isAndroid) {
      _hideKeyboard();
    }
  }

  Future<bool> _onWillPop() async {
    setState(() {
      _isDisposing = true;
    });
    return true;
  }

  void _hideKeyboard() {
    _webviewController.hideKeyboard();
  }

  void _disableKeyboard() {
    _webviewController.disableKeyboard();
  }

  void _enableKeyboard() {
    _webviewController.enableKeyboard();
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
      await _webviewController.loadUrl(ip);
      // await _webviewController?.loadFile(
      //   assetFilePath: 'assets/editor/index.html',
      // );
    } else {
      _webviewController.loadFile('assets/editor/index.html');
    }
  }

  void _bindMessageReceived() {
    _webviewController.addJavaScriptHandler(
      'update_state',
      (dynamic argument) {
        // logger.i("update_state: $argument");
        if (argument != null) {
          final data = argument;
          if (data != null) {
            final state = jsonDecode(data) as Map<String, dynamic>?;
            _updateState(state);
          }
        }
      },
    );
    _webviewController.addJavaScriptHandler(
      'save_file',
      (dynamic argument) {
        if (argument != null) {
          final data = argument;
          if (data != null) {
            final content = jsonDecode(data) as String?;
            _saveFile(content);
          }
        }
      },
    );
    _webviewController.addJavaScriptHandler(
      'scroll_position',
      (dynamic argument) {
        if (argument != null) {
          final data = argument;
          if (data != null) {
            // 直接使用 webviewController 的监听, 速度快很多
            // final scrollY = jsonDecode(data) as num?;
            // _onScrollPositionChange(scrollY?.toDouble());
          }
        }
      },
    );

    _webviewController.addJavaScriptHandler(
      'on_link_click_preview',
      (dynamic argument) {
        if (argument != null) {
          final data = argument;
          if (data != null) {
            final url = jsonDecode(data) as String?;
            _onClickPreviewLink(url);
          }
        }
      },
    );

    _webviewController.addJavaScriptHandler(
      'on_link_click_source',
      (dynamic argument) {
        if (argument != null) {
          final data = argument;
          if (data != null) {
            final url = jsonDecode(data) as String?;
            _onClickSourceLink(url);
          }
        }
      },
    );
  }

  void _onClickPreviewLink(String? url) async {
    _openUrl(url);
  }

  void _onClickSourceLink(String? url) async {
    _openUrl(url);
  }

  void _openUrl(String? url) {
    if (url != null) {
      Utility.openUrl(url);
    }
  }

  Color _getTitleColor(double scrollY, Color baseColor) {
    // const maxOffset = 30.0;
    // final minScrollY = maxOffset;
    // if (scrollY < minScrollY) {
    //   return Colors.transparent;
    // }
    // final offset = scrollY - minScrollY;
    // final opacity = (offset / maxOffset).clamp(0.0, 1.0); // 0.0 ~ 1.0
    // return baseColor.withAlpha(
    //   (255.0 * opacity).round(),
    // );
    return baseColor;
  }

  void _onHtmlScrollPositionChange(double x, double y) {
    if (_isDisposing) return;
    if (!_webviewController.isLoaded()) return;
    if (!mounted) return;
    _onScrollPositionChange(y);
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
    // _setAppBarColor(_defaultTitleBgColor, _defaultTitleTextColor);
    _setAppBarColor(
      ThemeColors.getBgColor(ThemeColors.getColorScheme(context)),
      ThemeColors.getTextColor(ThemeColors.getColorScheme(context)),
    );
  }

  void _onScrollPositionChange(double? scrollY) {
    if (_isDisposing) return;
    if (!_webviewController.isLoaded()) return;
    if (!mounted) return;
    if (scrollY == null) return;

    late final double adjustedScrollY;
    if (Platform.isAndroid) {
      adjustedScrollY = scrollY / MediaQuery.of(context).devicePixelRatio;
    } else {
      adjustedScrollY = scrollY;
    }

    final colorScheme = ThemeColors.getColorScheme(context);
    final bgColor = ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);

    final newBgColor = _getTitleColor(adjustedScrollY, bgColor);
    final newTextColor = _getTitleColor(adjustedScrollY, textColor);

    _setAppBarColor(newBgColor, newTextColor);
  }

  void _updateState(Map<String, dynamic>? state) async {
    if (_isDisposing) return;
    if (!_webviewController.isLoaded()) return;
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
    if (!_webviewController.isLoaded()) return;
    if (!_canUndo) return;
    HapticFeedback.mediumImpact();
    await _runWebCommand('undo', null);
  }

  void _redo() async {
    if (!_webviewController.isLoaded()) return;
    if (!_canRedo) return;
    HapticFeedback.mediumImpact();
    await _runWebCommand('redo', null);
  }

  void _saveFile(String? content) {
    if (!_webviewController.isLoaded()) return;
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
      _hideKeyboard();
    } else if (Platform.isIOS) {
      // iOS切换页面时似乎会自动关闭键盘
    }
  }

  void _openWorkspaceSettings() {
    AppRouter.jumpToWorkspaceSettingsPage(context);
    if (Platform.isAndroid) {
      _hideKeyboard();
    } else if (Platform.isIOS) {
      // iOS切换页面时似乎会自动关闭键盘
    }
  }

  void _refreshWebview() async {
    if (!_webviewController.isLoaded()) return;
    await _webviewController.reload();
    _resetAppBarColor();
  }

  Future<void> _save() async {
    final content = await _getContentCommand();
    _saveFile(content);
  }

  Future<String?> _getContentCommand() async {
    if (!_webviewController.isLoaded()) return null;
    final s = await _webviewController.executeJavaScript(
      "window.getContent()",
      hasResult: true,
    ) as String?;
    if (s != null) {
      return jsonDecode(s);
    }
    return null;
  }

  Future<void> _reinitEditor() async {
    if (!_webviewController.isLoaded()) return;
    await _webviewController.executeJavaScript(
      """
        window.isShowLineNumber = $_isShowLineNumber;
        window.sourceMode = $_sourceMode;
      """,
    );
    await _runWebCommand('reinit_editor', null);
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
    SettingsController.setSourceMode(ref, targetSourceMode);
    await _runWebCommand('change_source_mode', targetSourceMode);
  }

  void _openVConsole() {
    if (!_webviewController.isLoaded()) return;
    _webviewController.executeJavaScript("window.setupVConsole()");
  }

  Future<void> _initWebEditor() async {
    await _webviewController.executeJavaScript(
      """
      (() => {
        const init = () => {
          if (window.initEditor) {
            try {
              window.isShowLineNumber = $_isShowLineNumber;
              window.sourceMode = $_sourceMode;
              window.initEditor("${widget.path}", ${jsonEncode(fileContent)});
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
    if (!_webviewController.isLoaded()) return;
    final dataStr = data == null ? "null" : jsonEncode(data);
    await _webviewController.executeJavaScript(
      """
      try {
        window.invokeCommand("$command", $dataStr);
      } catch(e) {
        console.error('invokeComrror:', e);
      }
      """,
    );
  }

  Future<T?> _runWebCommandResult<T>(String command, dynamic data) async {
    if (!_webviewController.isLoaded()) return null;
    final dataStr = data == null ? "null" : jsonEncode(data);
    final result = await _webviewController.executeJavaScript(
      """
      (function() {
        try {
          return window.invokeCommand("$command", $dataStr);
        } catch(e) {
          console.error('invokeComrror:', e);
          return null;
        }
      })()
      """,
      hasResult: true,
    );
    if (result == null) return null;
    return result as T;
  }

  Future<void> _updateColorMode(bool updateEditor) async {
    if (_webviewController.isLoaded()) {
      final t = ref.read(settingsProvider.select((s) => s.theme));
      final sn = ref.read(settingsProvider.notifier);
      final brightness = sn.getResolveTheme();
      final theme = brightness == Brightness.dark ? 'dark' : 'light';
      final primaryColor = t.primaryColor
          .toARGB32()
          .toRadixString(16)
          .padLeft(8, '0')
          .substring(2);
      await _webviewController.executeJavaScript(
        'window.setColorMode("$theme", "#$primaryColor", $updateEditor)',
      );
    }
  }

  Future<void> _updateWebViewUI() async {
    if (_isDisposing) return;
    if (!mounted) return;
    // 设置 webview 的背景颜色
    // final bgColor = ThemeColors.getBgColor(ThemeColors.getColorScheme(context));
    // await _controller.setBackgroundColor(bgColor);
    // await _controller.setBackgroundColor(Colors.transparent);

    if (_webviewController.isLoaded()) {
      final s = ref.read(settingsProvider.select((s) => s.settings));
      if (s != null) {
        final autoSave = s.autoSave;
        final autoSaveInterval = s.autoSaveInterval;
        final autoSaveFocusChange = s.autoSaveFocusChange;
        await _webviewController.executeJavaScript(
          'window.setAutoSave($autoSave, $autoSaveInterval, $autoSaveFocusChange)',
        );
      }
      await _updateColorMode(false);
      _onScrollPositionChange(0);
      if (mounted) {
        await _webviewController.executeJavaScript('window.setTitleHeight(0)');
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

  void _showCustomToolbar(
    _EditorCustomToolbarType type,
    bool handleKeyboard,
  ) {
    if (type == _EditorCustomToolbarType.none) {
      if (handleKeyboard) {
        // 重新显示出键盘, 会有一瞬间关闭再弹出的状态, 增加一个状态延迟后清除
        setState(() {
          _reShowKeyboard = true;
        });
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted) {
            setState(() {
              _reShowKeyboard = false;
            });
          }
        });
        _enableKeyboard();
      }
    } else {
      if (handleKeyboard) {
        setState(() {
          _reHideKeyboard = true;
        });
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            setState(() {
              _reHideKeyboard = false;
            });
          }
        });
        _disableKeyboard();
      }
    }
    setState(() {
      _showToolbarType = type;
    });
  }

  void _hideCustomToolbar(bool handleKeyboard) {
    _showCustomToolbar(_EditorCustomToolbarType.none, handleKeyboard);
  }

  void _onToolbarActionAdd() {
    HapticFeedback.mediumImpact();
    if (_showToolbarType != _EditorCustomToolbarType.addToolbar) {
      _showCustomToolbar(_EditorCustomToolbarType.addToolbar, true);
    } else {
      _hideCustomToolbar(true);
    }
  }

  void _onToolbarActionTextStyle() {
    HapticFeedback.mediumImpact();
    if (_showToolbarType != _EditorCustomToolbarType.textStyleToolbar) {
      _showCustomToolbar(_EditorCustomToolbarType.textStyleToolbar, true);
    } else {
      _hideCustomToolbar(true);
    }
  }

  List<Widget> _buildTitleActions(ColorScheme colorScheme) {
    final theme = AppTheme.getPullDownMenuRouteThemeNoAlpha(context);
    return [
      PlatformIconButton(
        icon: Icon(
          _previewMode ? ThemeIcons.edit(context) : ThemeIcons.preview(context),
          color: ThemeColors.getTextColor(colorScheme),
        ),
        padding: const EdgeInsets.all(2),
        onPressed: () {
          HapticFeedback.selectionClick();
          _changeEditModeCommand();
        },
      ),
      // 如果 PullDown 下面是 webview, 背景会错误的变为透明
      // https://github.com/notDmDrl/pull_down_button/issues/28
      PlatformPullDownButton(
        routeTheme: theme,
        padding: const EdgeInsets.all(2),
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
          if (AppConfig.isDebug)
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
    return CustomWebviewInApp(
      controller: _webviewController,
      onWebviewCreate: () {
        _bindMessageReceived();
        _loadFileContent().then((_) {
          _initWebView();
        });
      },
      onLoadFinish: () async {
        await _updateWebViewUI();
        await _initWebEditor();
      },
      onScrollChanged: (x, y) {
        _onHtmlScrollPositionChange(x, y);
      },
    );
  }

  Widget? _buildBottomBarPlaceholder(MediaQueryData mediaQuery) {
    final isShow = _isShowKeyboard ||
        _showToolbarType != _EditorCustomToolbarType.none ||
        _reShowKeyboard;
    final bottom = mediaQuery.viewInsets.bottom;
    final placeholderHeight = math.max(0, _openKeyboardHeight - bottom);
    return isShow
        ? SizedBox(
            height: _toolbarHeight + placeholderHeight,
          )
        : null;
  }

  Widget? _buildBottomPanel(_EditorCustomToolbarType type) {
    if (type == _EditorCustomToolbarType.none) {
      return null;
    }
    if (type == _EditorCustomToolbarType.addToolbar) {
      return EditorAddToolbar(
        onAction: (action) {
          if (_isDisposing) return;
          if (!mounted) return;
          if (!_webviewController.isLoaded()) return;
          _runWebCommand("add_markdown_action", action);
        },
      );
    } else if (type == _EditorCustomToolbarType.textStyleToolbar) {
      return EditorTextStyleToolbar(
        onAction: (action) {
          if (_isDisposing) return;
          if (!mounted) return;
          if (!_webviewController.isLoaded()) return;
          _runWebCommand("text_style_action", action);
        },
      );
    } else {
      return null;
    }
  }

  Widget _buildToolbarIconButton({
    required Widget icon,
    VoidCallback? onPressed,
    _EditorCustomToolbarType? type,
    String? tooltip,
  }) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final selectBgColor = ThemeColors.getBg1Color(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);
    final isSelect = type != null && _showToolbarType == type;
    return IconButton(
      icon: icon,
      style: IconButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10.0),
        ),
        highlightColor: Colors.transparent,
        backgroundColor: isSelect ? selectBgColor : null,
        foregroundColor: textColor,
      ),
      onPressed: onPressed,
      tooltip: tooltip,
    );
  }

  Widget? _buildBottomToolbarPanel(ColorScheme colorScheme) {
    final bgColor = ThemeColors.getBgColor(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);
    final bg1Color = ThemeColors.getBg1Color(colorScheme);
    final isShow = _isShowKeyboard ||
        _showToolbarType != _EditorCustomToolbarType.none ||
        _reShowKeyboard;
    return isShow
        ? Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: _toolbarHeight,
                padding: EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: bgColor,
                  border: Border.all(color: textColor.withAlpha(20)),
                ),
                child: SafeArea(
                  left: true,
                  right: true,
                  bottom: false,
                  top: false,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          _buildToolbarIconButton(
                            icon: Icon(ThemeIcons.add(context)),
                            type: _EditorCustomToolbarType.addToolbar,
                            onPressed: _onToolbarActionAdd,
                          ),
                          _buildToolbarIconButton(
                            icon: FittedBox(
                              child: Text(
                                "Aa",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            type: _EditorCustomToolbarType.textStyleToolbar,
                            onPressed: _onToolbarActionTextStyle,
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          _buildToolbarIconButton(
                            icon: Icon(ThemeIcons.undo(context)),
                            tooltip: '撤销',
                            onPressed: _canUndo ? _undo : null,
                          ),
                          _buildToolbarIconButton(
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
                          _buildToolbarIconButton(
                            icon: Icon(ThemeIcons.keyboardHide(context)),
                            tooltip: '关闭键盘',
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              _hideKeyboard();
                              _hideCustomToolbar(false);
                              if (Platform.isIOS) {
                                _enableKeyboard();
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(
                height: math.max(0, _openKeyboardHeight),
                child: SingleChildScrollView(
                  child: SafeArea(
                    left: true,
                    right: true,
                    bottom: false,
                    top: false,
                    child: _buildBottomPanel(_showToolbarType) ??
                        Container(
                          color: bg1Color,
                        ),
                  ),
                ),
              ),
            ],
          )
        : null;
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);
    final showName = WsUtils.getFileShowName(name);
    final colorScheme = ThemeColors.getColorScheme(context);
    final mediaQuery = MediaQuery.of(context);
    final bottomBarPlaceholder = _buildBottomBarPlaceholder(mediaQuery);
    final bottomPanel = _buildBottomToolbarPanel(colorScheme);

    return PlatformSimplePage(
      titleActions: _buildTitleActions(colorScheme),
      onWillPop: Platform.isAndroid ? _onWillPop : null,
      bottomBar: bottomPanel,
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
          Column(
            children: [
              AppBar(backgroundColor: Colors.transparent),
              Flexible(
                child: _buildWebView(colorScheme),
              ),
              if (bottomBarPlaceholder != null) bottomBarPlaceholder,
            ],
          ),
        ],
      ),
    );
  }
}

enum _EditorCustomToolbarType {
  none,
  addToolbar,
  textStyleToolbar,
}
