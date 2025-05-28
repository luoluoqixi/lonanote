import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/app_bar.dart';

class PlatformPage extends StatefulWidget {
  final ScrollController? scrollController;
  final ScrollAppBar? appBar;
  final String? title;
  final String? subTitle;
  final List<Widget>? titleActions;
  final Widget? child;
  final List<Widget>? contents;

  final Color? backgroundColor;
  final bool? isLoading;

  final RefreshCallback? onRefresh;

  const PlatformPage({
    super.key,
    this.scrollController,
    this.appBar,
    this.title,
    this.subTitle,
    this.titleActions,
    this.child,
    this.contents,
    this.backgroundColor,
    this.isLoading,
    this.onRefresh,
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

  Widget buildCustomScroll(BuildContext context, ScrollAppBar? appBar) {
    return CustomScrollView(
      controller: widget.scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        if (appBar != null) appBar,
        if (widget.child != null)
          SliverToBoxAdapter(
            child: widget.child,
          ),
        ...?widget.contents,
      ],
    );
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
            child: widget.onRefresh != null
                ? RefreshIndicator(
                    onRefresh: widget.onRefresh!,
                    edgeOffset: widget.title == null
                        ? 0.0
                        : (ScrollAppBar.defaultExpandedHeight +
                            MediaQuery.of(context).padding.top),
                    child: buildCustomScroll(context, appBar),
                  )
                : buildCustomScroll(context, appBar),
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
  final ScrollController? scrollController;
  final PlatformAppBar? appBar;
  final String? title;
  final Widget child;

  final Color? backgroundColor;
  final bool? isLoading;

  final RefreshCallback? onRefresh;

  const PlatformSimplePage({
    super.key,
    this.scrollController,
    this.appBar,
    this.title,
    required this.child,
    this.backgroundColor,
    this.isLoading,
    this.onRefresh,
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

  Widget buildCustomScroll(BuildContext context, Widget? appBar) {
    return CustomScrollView(
      slivers: [
        if (appBar != null) appBar,
        SliverToBoxAdapter(
          child: widget.child,
        ),
      ],
    );
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
            child: widget.onRefresh != null
                ? RefreshIndicator(
                    onRefresh: widget.onRefresh!,
                    edgeOffset: widget.title == null
                        ? 0.0
                        : (ScrollAppBar.defaultExpandedHeight +
                            MediaQuery.of(context).padding.top),
                    child: buildCustomScroll(context, appBar),
                  )
                : buildCustomScroll(context, appBar),
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

class PlatformSheetPage extends StatelessWidget {
  final String? title;
  final double? titleFontSize;
  final EdgeInsetsGeometry? titlePadding;
  final EdgeInsetsGeometry? contentPadding;
  final List<Widget>? children;
  final Widget? child;

  const PlatformSheetPage({
    super.key,
    this.title,
    this.titlePadding,
    this.titleFontSize,
    this.contentPadding,
    this.child,
    this.children,
  });
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
              padding: titlePadding ??
                  EdgeInsets.only(
                    bottom: 15.0,
                    left: 20.0,
                    right: 20.0,
                  ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  title!,
                  style: TextStyle(
                    fontSize: titleFontSize ?? 20,
                  ),
                ),
              )),
        if (child != null)
          Padding(
            padding: contentPadding ??
                EdgeInsets.only(
                  left: 20.0,
                  right: 20.0,
                ),
            child: child!,
          ),
        ...?children?.map((child) => Padding(
              padding: contentPadding ??
                  EdgeInsets.only(
                    left: 20.0,
                    right: 20.0,
                  ),
              child: child,
            )),
      ],
    );
  }
}
