import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/app_theme.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/app_bar.dart';
import 'package:lonanote/src/widgets/flutter/custom_refresh_indicator.dart';
import 'package:lonanote/src/widgets/platform_double_back.dart';
import 'package:lonanote/src/widgets/platform_scrollbar.dart' as m;

class PlatformPage extends StatefulWidget {
  final ScrollAppBar? appBar;
  final Widget? bottomBar;
  final List<Widget>? stacks;
  final Widget? title;
  final String? titleText;
  final Widget? subTitle;
  final String? subTitleText;
  final List<Widget>? titleActions;
  final Widget? child;
  final List<Widget>? contents;

  final bool? isHome;
  final Future<bool> Function()? onWillPop;

  final Color? backgroundColor;
  final Color? titleColor;
  final bool? centerTitle;

  final bool? isLoading;
  final Future<void> Function()? onRefresh;

  final Key? scrollKey;
  final bool? showScrollbar;
  final ScrollController? scrollController;
  final bool? scrollThumbVisibility;
  final bool? scrollInteractive;
  final double? scrollThickness;
  final double? scrollRadius;
  final ValueChanged<bool>? onDragIsActiveChanged;

  final bool? resizeToAvoidBottomInset;

  const PlatformPage({
    super.key,
    this.scrollController,
    this.appBar,
    this.bottomBar,
    this.stacks,
    this.title,
    this.titleText,
    this.subTitle,
    this.subTitleText,
    this.titleActions,
    this.centerTitle,
    this.child,
    this.contents,
    this.isHome,
    this.onWillPop,
    this.backgroundColor,
    this.titleColor,
    this.isLoading,
    this.onRefresh,
    this.scrollKey,
    this.showScrollbar,
    this.scrollThumbVisibility,
    this.scrollInteractive,
    this.scrollThickness,
    this.scrollRadius,
    this.onDragIsActiveChanged,
    this.resizeToAvoidBottomInset,
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
    return (widget.title == null && widget.titleText == null)
        ? 0.0
        : (ScrollAppBar.defaultExpandedHeight +
            MediaQuery.of(context).padding.top);
  }

  Widget _buildPageContent(ScrollController controller, BuildContext context) {
    final appBar = _buildAppBar();
    return CustomScrollView(
      key: widget.scrollKey,
      controller: controller,
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
    if (widget.appBar != null) return widget.appBar;
    if (widget.title == null && widget.titleText == null) return null;
    return ScrollAppBar(
      title: widget.title,
      titleText: widget.titleText,
      subTitle: widget.subTitle,
      subTitleText: widget.subTitleText,
      actions: widget.titleActions,
      centerTitle: widget.centerTitle,
      bgColor: widget.titleColor,
    );
  }

  Widget _buildPage() {
    final scrollController = widget.scrollController ?? ScrollController();
    final content = widget.onRefresh != null
        ? CustomRefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: _getAppBarHeight(),
            child: _buildPageContent(scrollController, context),
          )
        : _buildPageContent(scrollController, context);

    var child = content;
    if (widget.showScrollbar == true) {
      child = m.PlatformScrollbar(
        controller: scrollController,
        thumbVisibility: widget.scrollThumbVisibility ?? false,
        interactive: widget.scrollInteractive ?? true,
        thickness: widget.scrollThickness,
        radius: widget.scrollRadius,
        onDragIsActiveChanged: widget.onDragIsActiveChanged,
        child: content,
      );
    }
    return Column(
      children: [
        Expanded(
          child: child,
        ),
        if (widget.bottomBar != null) widget.bottomBar!,
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final backgroundColor = ThemeColors.getBgColor(colorScheme);
    final isHome = widget.isHome == true;
    final child = Container(
      color: widget.backgroundColor ?? Colors.transparent,
      child: SafeArea(
        left: true,
        right: true,
        top: false,
        bottom: false,
        child: _buildPage(),
      ),
    );
    final isWillPop = widget.onWillPop != null &&
        Theme.of(context).platform == TargetPlatform.android;
    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: PlatformDoubleBack(
            isEnable: isHome,
            child: isWillPop
                // ignore: deprecated_member_use
                ? WillPopScope(
                    child: child,
                    onWillPop: () {
                      if (widget.onWillPop != null) {
                        return widget.onWillPop!();
                      }
                      return Future.value(true);
                    })
                : child,
          ),
          material: (context, platform) => MaterialScaffoldData(
            resizeToAvoidBottomInset: widget.resizeToAvoidBottomInset,
          ),
          cupertino: (context, platform) => CupertinoPageScaffoldData(
            resizeToAvoidBottomInset: widget.resizeToAvoidBottomInset,
          ),
        ),
        ...?widget.stacks,
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
  final Widget? bottomBar;
  final Widget? title;
  final String? titleText;
  final Widget? child;
  final List<Widget>? contents;
  final bool? isHome;
  final Future<bool> Function()? onWillPop;

  final Color? backgroundColor;
  final Color? titleBgColor;
  final Color? titleTextColor;
  final List<Widget>? titleActions;
  final bool? centerTitle;
  final bool? extendBodyBehindAppBar;

  final bool? isLoading;
  final Future<void> Function()? onRefresh;

  final bool? noScrollView;

  final bool? showScrollbar;
  final ScrollController? scrollController;
  final bool? scrollThumbVisibility;
  final bool? scrollInteractive;
  final double? scrollThickness;
  final double? scrollRadius;
  final ValueChanged<bool>? onDragIsActiveChanged;

  final bool? resizeToAvoidBottomInset;

  const PlatformSimplePage({
    super.key,
    this.scrollController,
    this.appBar,
    this.bottomBar,
    this.title,
    this.titleText,
    this.child,
    this.contents,
    this.isHome,
    this.onWillPop,
    this.backgroundColor,
    this.titleBgColor,
    this.titleTextColor,
    this.titleActions,
    this.centerTitle,
    this.extendBodyBehindAppBar,
    this.isLoading,
    this.onRefresh,
    this.noScrollView,
    this.showScrollbar,
    this.scrollThumbVisibility,
    this.scrollInteractive,
    this.scrollThickness,
    this.scrollRadius,
    this.onDragIsActiveChanged,
    this.resizeToAvoidBottomInset,
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
    return (widget.title == null && widget.titleText == null)
        ? 0.0
        : (SimpleAppBar.defaultHeight + MediaQuery.of(context).padding.top);
  }

  Widget _buildPageContent(
    ColorScheme colorScheme,
    ScrollController controller,
    BuildContext context,
  ) {
    final appBar = _buildAppBar(colorScheme);
    if (widget.noScrollView == true) {
      if (widget.extendBodyBehindAppBar == true) {
        final SystemUiOverlayStyle overlayStyle =
            AppTheme.getSystemOverlayStyle(colorScheme);
        return AnnotatedRegion<SystemUiOverlayStyle>(
          // 如果不加这个, 那么安卓端热重载后 BottomNavBar 会变黑
          value: overlayStyle,
          child: Stack(
            children: [
              // 页面主内容
              SafeArea(
                top: false,
                left: true,
                right: true,
                bottom: false,
                child: Column(
                  children: [
                    if (widget.child != null)
                      Expanded(
                        child: widget.child!,
                      ),
                    ...?widget.contents,
                  ],
                ),
              ),

              // 状态栏遮罩层（带渐变或颜色）
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: MediaQuery.of(context).padding.top +
                      SimpleAppBar.defaultHeight,
                  color: widget.titleBgColor ??
                      ThemeColors.getBgColor(colorScheme),
                ),
              ),

              // AppBar
              if (appBar != null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    left: true,
                    right: true,
                    top: true,
                    bottom: false,
                    child: SizedBox(
                      height: SimpleAppBar.defaultHeight,
                      child: appBar,
                    ),
                  ),
                ),
            ],
          ),
        );
      } else {
        return Column(
          children: [
            if (appBar != null) appBar,
            if (widget.child != null)
              Expanded(
                child: widget.child!,
              ),
            ...?widget.contents,
          ],
        );
      }
    }
    return CustomScrollView(
      controller: controller,
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

  Widget? _buildAppBar(ColorScheme colorScheme) {
    final backgroundColor =
        widget.titleBgColor ?? ThemeColors.getBgColor(colorScheme);
    final textColor =
        widget.titleTextColor ?? ThemeColors.getTextColor(colorScheme);
    if (widget.appBar != null) return widget.appBar;
    if (widget.title == null && widget.titleText == null) return null;
    if (widget.noScrollView == true) {
      var titleBgColor = backgroundColor;
      if (widget.extendBodyBehindAppBar == true) {
        // 如果 extendBodyBehindAppBar 为 true, 则 AppBar 背景色由下层Stack绘制
        titleBgColor = Colors.transparent;
      }
      return AppBar(
        centerTitle: widget.centerTitle ?? false,
        actions: widget.titleActions,
        title: widget.title ??
            Text(
              widget.titleText ?? "",
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
        titleTextStyle: TextStyle(color: textColor, fontSize: 22),
        backgroundColor: titleBgColor,
        toolbarHeight: SimpleAppBar.defaultHeight,
        actionsPadding: const EdgeInsets.only(right: 15.0),
      );
    }
    return SimpleAppBar(
      actions: widget.titleActions,
      title: widget.title,
      titleText: widget.titleText,
      bgColor: backgroundColor,
    );
  }

  Widget _buildPage(ColorScheme colorScheme) {
    final scrollController = widget.scrollController ?? ScrollController();
    final content = widget.onRefresh != null
        ? CustomRefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: _getAppBarHeight(),
            child: _buildPageContent(colorScheme, scrollController, context),
          )
        : _buildPageContent(colorScheme, scrollController, context);
    if (widget.noScrollView == true) {
      return content;
    }
    if (widget.showScrollbar == true) {
      return m.PlatformScrollbar(
        controller: scrollController,
        thumbVisibility: widget.scrollThumbVisibility ?? false,
        interactive: widget.scrollInteractive ?? true,
        thickness: widget.scrollThickness,
        radius: widget.scrollRadius,
        onDragIsActiveChanged: widget.onDragIsActiveChanged,
        child: content,
      );
    }
    return content;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    final backgroundColor = ThemeColors.getBgColor(colorScheme);
    final isHome = widget.isHome == true;
    final child = Container(
      color: widget.backgroundColor ?? Colors.transparent,
      child: SafeArea(
        left: true,
        right: true,
        top: false,
        bottom: false,
        child: _buildPage(colorScheme),
      ),
    );
    final isWillPop = widget.onWillPop != null &&
        Theme.of(context).platform == TargetPlatform.android;
    return Stack(
      children: [
        PlatformScaffold(
          backgroundColor: backgroundColor,
          body: PlatformDoubleBack(
            isEnable: isHome,
            child: isWillPop
                // ignore: deprecated_member_use
                ? WillPopScope(
                    child: child,
                    onWillPop: () {
                      if (widget.onWillPop != null) {
                        return widget.onWillPop!();
                      }
                      return Future.value(true);
                    })
                : child,
          ),
          material: (context, platform) => MaterialScaffoldData(
            resizeToAvoidBottomInset: widget.resizeToAvoidBottomInset,
          ),
          cupertino: (context, platform) => CupertinoPageScaffoldData(
            resizeToAvoidBottomInset: widget.resizeToAvoidBottomInset,
          ),
        ),
        if (widget.bottomBar != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: widget.bottomBar!,
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
  final Color? titleBgColor;
  final Color? contentBgColor;

  final Widget? title;
  final String? titleText;
  final double? titleFontSize;
  final EdgeInsetsGeometry? titlePadding;
  final EdgeInsetsGeometry? contentPadding;
  final List<Widget>? children;
  final Widget? child;
  final double? desiredHeight;
  final double? childSize;
  final double? minChildSize;
  final double? maxChildSize;
  final bool? expand;

  final bool? allowScroll;

  final bool? isLoading;
  final Future<void> Function()? onRefresh;

  const PlatformSheetPage({
    super.key,
    this.titleBgColor,
    this.contentBgColor,
    this.title,
    this.titleText,
    this.titlePadding,
    this.titleFontSize,
    this.contentPadding,
    this.child,
    this.children,
    this.desiredHeight,
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

  Widget _buildAppBar(BuildContext context, ColorScheme colorScheme) {
    final title = _buildTitle(context);

    return Container(
      decoration: BoxDecoration(
        color: widget.titleBgColor ?? ThemeColors.getBg1Color(colorScheme),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          _buildDargToolbar(),
          if (title != null) title,
          const Padding(
            padding: EdgeInsets.only(top: 12.0),
            child: Divider(
              height: 1,
              thickness: 1,
              color: Colors.grey,
            ),
          ),
        ],
      ),
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
                  top: 12,
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
        ? CustomRefreshIndicator(
            onRefresh: widget.onRefresh!,
            edgeOffset: 0.0,
            child: _buildContentScroll(context),
          )
        : _buildContentScroll(context);
  }

  @override
  Widget build(BuildContext context) {
    var childSize = widget.childSize ?? 0.5;
    if (widget.desiredHeight != null) {
      final screenHeight = MediaQuery.of(context).size.height;
      childSize = widget.desiredHeight! / screenHeight;
    }
    if (childSize < 0) {
      childSize = 0;
    }
    if (childSize > 1) {
      childSize = 1;
    }
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
          final colorScheme = ThemeColors.getColorScheme(context);
          return Stack(
            children: [
              Column(
                children: [
                  _buildAppBar(context, colorScheme),
                  Expanded(
                    child: Container(
                      color: widget.contentBgColor ??
                          ThemeColors.getBg1Color(colorScheme),
                      child: SafeArea(
                        left: true,
                        right: true,
                        top: false,
                        bottom: false,
                        child: _buildContent(context),
                      ),
                    ),
                  ),
                ],
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
