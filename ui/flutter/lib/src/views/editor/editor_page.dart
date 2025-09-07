import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/fs/fs.dart';
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

class EditorSelectionData {
  bool isSelectionRange = false;
  bool isBold = false;
  bool isItalic = false;
  bool isStrikethrough = false;
  bool isHighlight = false;
  bool isInlineCode = false;

  bool isHeading1 = false;
  bool isHeading2 = false;
  bool isHeading3 = false;
  bool isHeading4 = false;
  bool isHeading5 = false;
  bool isHeading6 = false;
  bool isUnorderedList = false;
  bool isOrderedList = false;
  bool isTaskList = false;
  bool isBlockquote = false;
}

class _EditorPageState extends ConsumerState<EditorPage>
    with WidgetsBindingObserver, RouteAware {
  final CustomWebviewController _webviewController = CustomWebviewController();

  static String assetsDomain = "lonanoteappassets.androidplatform.net";
  static String assetsPrefix = "/files/";
  static String assetScheme = "assets";

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

  final EditorSelectionData _selectionData = EditorSelectionData();

  Timer? _updateKeyboardEvent;
  bool _canUpdateKeyboard = true;
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
      if (!_canUpdateKeyboard) return;
      if (Platform.isAndroid) {
        if (height > 0) {
          height += MediaQuery.of(context).viewPadding.bottom;
        }
      }
      if (_updateKeyboardEvent != null) {
        _updateKeyboardEvent!.cancel();
        _updateKeyboardEvent = null;
      }
      if (Platform.isIOS && _currentkeyboardHeight != 0.0 && height != 0.0) {
        // logger.e("keyboard height: $height");
        _updateKeyboardEvent = Timer(const Duration(milliseconds: 300), () {
          if (mounted) {
            _updateKeyboard(height);
            _updateKeyboardEvent = null;
          }
        });
      } else {
        if (_currentkeyboardHeight != height) {
          _updateKeyboard(height);
        }
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

  @override
  void didPushNext() {
    super.didPushNext();
    _hideKeyboard();
    _hideCustomToolbar(false);
    if (Platform.isIOS) {
      _enableKeyboard();
    }
  }

  Future<bool> _onWillPop() async {
    setState(() {
      _isDisposing = true;
    });
    return true;
  }

  void _updateKeyboard(double height) {
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
        if (_isShowKeyboard) {
          _showToolbarType = _EditorCustomToolbarType.none;
        }
      }
    });
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
      'update_selection',
      (dynamic argument) {
        // logger.i("update_selection: $argument");
        if (argument != null) {
          final data = argument;
          if (data != null) {
            final state = jsonDecode(data) as Map<String, dynamic>?;
            _updateSelectionData(state);
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

    // _webviewController.addJavaScriptHandler(
    //   'on_link_click_source',
    //   (dynamic argument) {
    //     if (argument != null) {
    //       final data = argument;
    //       if (data != null) {
    //         final url = jsonDecode(data) as String?;
    //         _onClickSourceLink(url);
    //       }
    //     }
    //   },
    // );
  }

  void _onClickPreviewLink(String? url) async {
    _openUrl(url);
  }

  void _openUrl(String? url) {
    if (url != null) {
      if (Utility.isImgUrl(url)) {
        Utility.openUrl(url);
      } else {
        final wsPath = WorkspaceController.getCurrentWorkspacePath(ref);
        final filePath = "$wsPath/$url";
        if (RustFs.exists(filePath)) {
          AppRouter.openFile(context, filePath, url);
        } else {
          logger.e("file notfound: $filePath");
        }
      }
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

  void _updateSelectionData(Map<String, dynamic>? state) async {
    if (_isDisposing) return;
    if (!_webviewController.isLoaded()) return;
    if (!mounted) return;
    if (state == null) return;

    final isSelectionRange = state['isSelectionRange'] == true;
    final isBold = state['isBold'] == true;
    final isItalic = state['isItalic'] == true;
    final isStrikethrough = state['isStrikethrough'] == true;
    final isHighlight = state['isHighlight'] == true;
    final isInlineCode = state['isInlineCode'] == true;

    final isHeading1 = state['isHeading1'] == true;
    final isHeading2 = state['isHeading2'] == true;
    final isHeading3 = state['isHeading3'] == true;
    final isHeading4 = state['isHeading4'] == true;
    final isHeading5 = state['isHeading5'] == true;
    final isHeading6 = state['isHeading6'] == true;
    final isUnorderedList = state['isUnorderedList'] == true;
    final isOrderedList = state['isOrderedList'] == true;
    final isTaskList = state['isTaskList'] == true;
    final isBlockquote = state['isBlockquote'] == true;

    bool needUpdate = false;

    if (isSelectionRange != _selectionData.isSelectionRange) {
      _selectionData.isSelectionRange = isSelectionRange;
      needUpdate = true;
    }
    if (isBold != _selectionData.isBold) {
      _selectionData.isBold = isBold;
      needUpdate = true;
    }
    if (isItalic != _selectionData.isItalic) {
      _selectionData.isItalic = isItalic;
      needUpdate = true;
    }
    if (isStrikethrough != _selectionData.isStrikethrough) {
      _selectionData.isStrikethrough = isStrikethrough;
      needUpdate = true;
    }
    if (isHighlight != _selectionData.isHighlight) {
      _selectionData.isHighlight = isHighlight;
      needUpdate = true;
    }
    if (isInlineCode != _selectionData.isInlineCode) {
      _selectionData.isInlineCode = isInlineCode;
      needUpdate = true;
    }
    if (isHeading1 != _selectionData.isHeading1) {
      _selectionData.isHeading1 = isHeading1;
      needUpdate = true;
    }
    if (isHeading2 != _selectionData.isHeading2) {
      _selectionData.isHeading2 = isHeading2;
      needUpdate = true;
    }
    if (isHeading3 != _selectionData.isHeading3) {
      _selectionData.isHeading3 = isHeading3;
      needUpdate = true;
    }
    if (isHeading4 != _selectionData.isHeading4) {
      _selectionData.isHeading4 = isHeading4;
      needUpdate = true;
    }
    if (isHeading5 != _selectionData.isHeading5) {
      _selectionData.isHeading5 = isHeading5;
      needUpdate = true;
    }
    if (isHeading6 != _selectionData.isHeading6) {
      _selectionData.isHeading6 = isHeading6;
      needUpdate = true;
    }
    if (isUnorderedList != _selectionData.isUnorderedList) {
      _selectionData.isUnorderedList = isUnorderedList;
      needUpdate = true;
    }
    if (isOrderedList != _selectionData.isOrderedList) {
      _selectionData.isOrderedList = isOrderedList;
      needUpdate = true;
    }
    if (isTaskList != _selectionData.isTaskList) {
      _selectionData.isTaskList = isTaskList;
      needUpdate = true;
    }
    if (isBlockquote != _selectionData.isBlockquote) {
      _selectionData.isBlockquote = isBlockquote;
      needUpdate = true;
    }

    if (needUpdate) {
      setState(() {});
    }
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
      var basePath = "";
      if (Platform.isAndroid) {
        final wsName = WorkspaceController.getCurrentWorkspaceName(ref);
        basePath = "https://$assetsDomain$assetsPrefix$wsName";
      } else {
        final wsPath = WorkspaceController.getCurrentWorkspacePath(ref);
        basePath = "$assetScheme://$wsPath";
      }
      await _webviewController.executeJavaScript(
        'window.setBasePath(${jsonEncode(basePath)})',
      );

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
  ) async {
    if (type == _EditorCustomToolbarType.none) {
      if (handleKeyboard) {
        // 重新显示出键盘, 会有一瞬间关闭再弹出的状态, 增加一个状态延迟后清除
        setState(() {
          _canUpdateKeyboard = false;
          _isShowKeyboard = true;
        });
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted) {
            setState(() {
              _canUpdateKeyboard = true;
            });
          }
        });
        _enableKeyboard();
        if (Platform.isIOS) {
          final isFocus = await _webviewController
              .executeJavaScript("window.editor?.editor?.hasFocus");
          if (!isFocus) {
            // iOS 下, 如果在打开 ToolbarPanel 的情况下后台, 那么会失去焦点, 此时需要重新弹出键盘
            _webviewController
                .executeJavaScript("window.editor?.editor?.focus()");
            // iOS 后台时, 会自动将键盘高度设置为 0, 如果此时弹出键盘， 又停止了键盘高度更新, 那么 _currentkeyboardHeight 将一直保持 0, 导致真正隐藏键盘时 _currentkeyboardHeight 未更新
            setState(() {
              _currentkeyboardHeight = _openKeyboardHeight;
            });
          }
        }
      }
    } else {
      if (handleKeyboard) {
        setState(() {
          _canUpdateKeyboard = false;
        });
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            setState(() {
              _canUpdateKeyboard = true;
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

  void _onToolbarActionBold() {
    HapticFeedback.mediumImpact();
    _runWebCommand("set_markdown_action", "bold");
  }

  void _onToolbarActionItalic() {
    HapticFeedback.mediumImpact();
    _runWebCommand("set_markdown_action", "italic");
  }

  void _onToolbarActionStrikethrough() {
    HapticFeedback.mediumImpact();
    _runWebCommand("set_markdown_action", "strikethrough");
  }

  void _onToolbarActionHighlight() {
    HapticFeedback.mediumImpact();
    _runWebCommand("set_markdown_action", "highlight");
  }

  void _onToolbarActionInlineCode() {
    HapticFeedback.mediumImpact();
    _runWebCommand("set_markdown_action", "inlineCode");
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
      assetDomain: assetsDomain,
      assetPrefix: assetsPrefix,
      assetScheme: assetScheme,
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
    final isShow =
        _isShowKeyboard || _showToolbarType != _EditorCustomToolbarType.none;
    final bottom = mediaQuery.viewInsets.bottom;
    final placeholderHeight = math.max(0.0, _openKeyboardHeight - bottom);
    final height = math.min(_toolbarHeight + placeholderHeight,
        _toolbarHeight + _openKeyboardHeight);
    return isShow
        ? Container(
            // color: Colors.red,
            height: height,
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
          HapticFeedback.mediumImpact();
          _runWebCommand("add_markdown_action", action);
          _hideCustomToolbar(true);
        },
      );
    } else if (type == _EditorCustomToolbarType.textStyleToolbar) {
      return EditorTextStyleToolbar(
        selectionData: _selectionData,
        onAction: (action) {
          if (_isDisposing) return;
          if (!mounted) return;
          if (!_webviewController.isLoaded()) return;
          HapticFeedback.mediumImpact();
          _runWebCommand("set_markdown_action", action);
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
    bool? isSelect,
    String? tooltip,
  }) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final selectBgColor = ThemeColors.getBg1Color(colorScheme);
    final textColor = ThemeColors.getTextColor(colorScheme);
    final select = isSelect ?? type != null && _showToolbarType == type;
    return IconButton(
      icon: icon,
      style: IconButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10.0),
        ),
        highlightColor: Colors.transparent,
        backgroundColor: select ? selectBgColor : null,
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
    final isShow =
        _isShowKeyboard || _showToolbarType != _EditorCustomToolbarType.none;
    final keyboardHeight = math.max(0.0, _openKeyboardHeight);
    return isShow
        ? Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: _toolbarHeight,
                padding: EdgeInsets.zero,
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
                      ConstrainedBox(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width - 160,
                        ),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            spacing: 1,
                            children: [
                              const SizedBox(width: 10),
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
                              _buildToolbarIconButton(
                                icon: Icon(ThemeIcons.bold(context)),
                                isSelect: _selectionData.isBold,
                                onPressed: _onToolbarActionBold,
                              ),
                              _buildToolbarIconButton(
                                icon: Icon(ThemeIcons.italic(context)),
                                isSelect: _selectionData.isItalic,
                                onPressed: _onToolbarActionItalic,
                              ),
                              _buildToolbarIconButton(
                                icon: Icon(ThemeIcons.strikethrough(context)),
                                isSelect: _selectionData.isStrikethrough,
                                onPressed: _onToolbarActionStrikethrough,
                              ),
                              _buildToolbarIconButton(
                                icon: Icon(ThemeIcons.highlight(context)),
                                isSelect: _selectionData.isHighlight,
                                onPressed: _onToolbarActionHighlight,
                              ),
                              _buildToolbarIconButton(
                                icon: Icon(ThemeIcons.inlineCode(context)),
                                isSelect: _selectionData.isInlineCode,
                                onPressed: _onToolbarActionInlineCode,
                              ),
                              const SizedBox(width: 10),
                            ],
                          ),
                        ),
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
                            width: 10,
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
              Container(
                color: Colors.transparent,
                height: keyboardHeight,
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
