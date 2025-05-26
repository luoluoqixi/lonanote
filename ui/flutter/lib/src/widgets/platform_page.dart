import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/app_bar.dart';

class PlatformPage extends StatefulWidget {
  final ScrollAppBar? appBar;
  final String? title;
  final String? subTitle;
  final List<Widget>? titleActions;
  final Widget? child;
  final List<Widget>? contents;

  final Color? backgroundColor;
  final bool? isLoading;

  const PlatformPage({
    super.key,
    this.appBar,
    this.title,
    this.subTitle,
    this.titleActions,
    this.child,
    this.contents,
    this.backgroundColor,
    this.isLoading,
  });

  @override
  State<StatefulWidget> createState() => _PlatformPageState();
}

class _PlatformPageState extends State<PlatformPage> {
  bool _isLoading = false;
  Timer? _loadingTimer;

  @override
  void didUpdateWidget(PlatformPage oldWidget) {
    super.didUpdateWidget(oldWidget);

    // 监听 isLoading 变化
    if (widget.isLoading != oldWidget.isLoading) {
      _handleLoadingChange();
    }
  }

  void _handleLoadingChange() {
    _loadingTimer?.cancel();
    if (widget.isLoading == true) {
      // 延迟 300ms 显示 loading
      _loadingTimer = Timer(const Duration(milliseconds: 300), () {
        if (mounted && widget.isLoading == true) {
          setState(() => _isLoading = true);
        }
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor =
        widget.backgroundColor ?? ThemeColors.getBgColor(colorScheme);
    final appBar = widget.appBar ??
        (widget.title != null
            ? ScrollAppBar(
                title: widget.title!,
                subTitle: widget.subTitle,
                actions: widget.titleActions,
              )
            : null);

    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: SafeArea(
            top: false,
            bottom: false,
            child: CustomScrollView(
              slivers: [
                if (appBar != null) appBar,
                if (widget.child != null)
                  SliverToBoxAdapter(
                    child: widget.child,
                  ),
                ...?widget.contents,
              ],
            ),
          ),
        ),
        if (_isLoading == true)
          Container(
            color: Colors.black45,
            child: Center(
              child: PlatformCircularProgressIndicator(),
            ),
          ),
      ],
    );
  }
}

class PlatformSimplePage extends StatefulWidget {
  final PlatformAppBar? appBar;
  final String? title;
  final Widget child;

  final Color? backgroundColor;
  final bool? isLoading;

  const PlatformSimplePage({
    super.key,
    this.appBar,
    this.title,
    required this.child,
    this.backgroundColor,
    this.isLoading,
  });

  @override
  State<StatefulWidget> createState() => _PlatformSimplePageState();
}

class _PlatformSimplePageState extends State<PlatformSimplePage> {
  bool _isLoading = false;
  Timer? _loadingTimer;

  @override
  void didUpdateWidget(PlatformSimplePage oldWidget) {
    super.didUpdateWidget(oldWidget);

    // 监听 isLoading 变化
    if (widget.isLoading != oldWidget.isLoading) {
      _handleLoadingChange();
    }
  }

  void _handleLoadingChange() {
    _loadingTimer?.cancel();
    if (widget.isLoading == true) {
      // 延迟 300ms 显示 loading
      _loadingTimer = Timer(const Duration(milliseconds: 300), () {
        if (mounted && widget.isLoading == true) {
          setState(() => _isLoading = true);
        }
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor =
        widget.backgroundColor ?? ThemeColors.getBgColor(colorScheme);
    final appBar = widget.appBar ??
        (widget.title != null
            ? SimpleAppBar(
                title: widget.title!,
              )
            : null);

    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: SafeArea(
            top: false,
            bottom: false,
            child: CustomScrollView(
              slivers: [
                if (appBar != null) appBar,
                SliverToBoxAdapter(
                  child: widget.child,
                ),
              ],
            ),
          ),
        ),
        if (_isLoading == true)
          Container(
            color: Colors.black45,
            child: Center(
              child: PlatformCircularProgressIndicator(),
            ),
          ),
      ],
    );
  }
}
