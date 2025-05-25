import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/scroll_app_bar.dart';

class PlatformPage extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor =
        this.backgroundColor ?? ThemeColors.getBgColor(colorScheme);
    final appBar = this.appBar ??
        (title != null
            ? ScrollAppBar(
                title: title!,
                subTitle: subTitle,
                actions: titleActions,
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
                if (child != null)
                  SliverToBoxAdapter(
                    child: child,
                  ),
                ...?contents,
              ],
            ),
          ),
        ),
        if (isLoading == true)
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
