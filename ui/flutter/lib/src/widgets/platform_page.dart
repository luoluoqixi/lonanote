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

  double _getAppBarHeight() {
    return ScrollAppBar.defaultExpandedHeight +
        MediaQuery.of(context).padding.top;
  }

  Widget _buildPageScroll(BuildContext context, Widget? appBar) {
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

  Widget? _buildAppBar() {
    return widget.appBar ??
        (widget.title != null
            ? ScrollAppBar(
                title: widget.title!,
                subTitle: widget.subTitle,
                actions: widget.titleActions,
              )
            : null);
  }

  Widget _buildPage() {
    final appBar = _buildAppBar();
    return widget.onRefresh != null
        ? RefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: widget.title == null ? 0.0 : _getAppBarHeight(),
            child: _buildPageScroll(context, appBar),
          )
        : _buildPageScroll(context, appBar);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor =
        widget.backgroundColor ?? ThemeColors.getBgColor(colorScheme);
    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: SafeArea(
            top: false,
            bottom: false,
            child: _buildPage(),
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
  final Widget? title;
  final String? titleText;
  final Widget child;

  final Color? backgroundColor;

  final bool? isLoading;
  final RefreshCallback? onRefresh;

  const PlatformSimplePage({
    super.key,
    this.scrollController,
    this.appBar,
    this.title,
    this.titleText,
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

  double _getAppBarHeight() {
    return SimpleAppBar.defaultHeight + MediaQuery.of(context).padding.top;
  }

  Widget _buildPageScroll(BuildContext context, Widget? appBar) {
    return CustomScrollView(
      slivers: [
        if (appBar != null) appBar,
        SliverToBoxAdapter(
          child: widget.child,
        ),
      ],
    );
  }

  Widget? _buildAppBar() {
    if (widget.appBar != null) return widget.appBar;
    if (widget.title == null && widget.titleText == null) return null;
    return SimpleAppBar(
      title: widget.title,
      titleText: widget.titleText,
    );
  }

  Widget _buildPage() {
    final appBar = _buildAppBar();
    return widget.onRefresh != null
        ? RefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: widget.title == null ? 0.0 : _getAppBarHeight(),
            child: _buildPageScroll(context, appBar),
          )
        : _buildPageScroll(context, appBar);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor =
        widget.backgroundColor ?? ThemeColors.getBgColor(colorScheme);
    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: SafeArea(
            top: false,
            bottom: false,
            child: _buildPage(),
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

class PlatformSheetPage extends StatefulWidget {
  final Widget? title;
  final String? titleText;
  final double? titleFontSize;
  final EdgeInsetsGeometry? titlePadding;
  final EdgeInsetsGeometry? contentPadding;
  final List<Widget>? children;
  final Widget? child;
  final double? childSize;
  final double? minChildSize;
  final double? maxChildSize;
  final bool? expand;

  final bool? allowScroll;

  final bool? isLoading;
  final RefreshCallback? onRefresh;

  const PlatformSheetPage({
    super.key,
    this.title,
    this.titleText,
    this.titlePadding,
    this.titleFontSize,
    this.contentPadding,
    this.child,
    this.children,
    this.childSize,
    this.minChildSize,
    this.maxChildSize,
    this.expand,
    this.allowScroll,
    this.isLoading,
    this.onRefresh,
  });

  @override
  State<StatefulWidget> createState() => _PlatformSheetPageState();
}

class _PlatformSheetPageState extends State<PlatformSheetPage> {
  bool _isLoading = false;
  Timer? _loadingTimer;

  @override
  void didUpdateWidget(PlatformSheetPage oldWidget) {
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

  Widget _buildDargToolbar() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Container(
        width: 40,
        height: 5,
        decoration: BoxDecoration(
          color: Colors.grey[400],
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }

  Widget? _buildTitle(BuildContext context) {
    if (widget.title == null && widget.titleText == null) return null;
    return Padding(
      padding: widget.titlePadding ??
          EdgeInsets.only(
            top: 0,
            bottom: 0.0,
            left: 20.0,
            right: 20.0,
          ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: widget.title ??
            Text(
              widget.titleText!,
              style: TextStyle(
                fontSize: widget.titleFontSize ?? 18,
              ),
            ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    final title = _buildTitle(context);

    return Column(
      children: [
        _buildDargToolbar(),
        if (title != null) title,
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 12.0),
          child: Divider(
            height: 1,
            thickness: 1,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildContentScroll(BuildContext context) {
    return CustomScrollView(
      physics: widget.allowScroll == true
          ? null
          : const NeverScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: widget.contentPadding ??
                const EdgeInsets.only(
                  left: 20.0,
                  right: 20.0,
                ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.child != null) widget.child!,
                ...?widget.children,
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    return widget.onRefresh != null
        ? RefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: 0.0,
            child: _buildContentScroll(context),
          )
        : _buildContentScroll(context);
  }

  @override
  Widget build(BuildContext context) {
    final childSize = widget.childSize ?? 0.5;
    var minChildSize = widget.minChildSize ?? childSize;
    var maxChildSize = widget.maxChildSize ?? childSize;
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: childSize,
        minChildSize: minChildSize,
        maxChildSize: maxChildSize,
        expand: widget.expand ?? false,
        builder: (context, scrollController) {
          final colorScheme = Theme.of(context).colorScheme;
          return Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: ThemeColors.getBgColor(colorScheme),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Column(
                  children: [
                    _buildAppBar(context),
                    Expanded(child: _buildContent(context)),
                  ],
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
        },
      ),
    );
  }
}
