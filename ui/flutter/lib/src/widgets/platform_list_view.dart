import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';

class PlatformListTile extends StatelessWidget {
  final Widget? leading;
  final Widget title;
  final Widget? trailing;
  final Widget? subtitle;

  final EdgeInsets? padding;
  final double? minTileHeight;

  final GestureTapCallback? onTap;

  final Color? pressBgColor;
  final bool? forcePressColor;

  const PlatformListTile({
    super.key,
    this.leading,
    required this.title,
    this.trailing,
    this.subtitle,
    this.minTileHeight,
    this.padding,
    this.onTap,
    this.pressBgColor,
    this.forcePressColor,
  });

  Widget _buildMaterial(BuildContext context) {
    final forcePressColor = this.forcePressColor == true;
    return Material(
      color: forcePressColor
          ? (pressBgColor ??
              ThemeColors.getPressBgColor(ThemeColors.getColorScheme(context)))
          : Colors.transparent,
      child: ListTile(
        contentPadding: padding,
        leading: leading,
        title: title,
        trailing: trailing,
        subtitle: subtitle,
        minTileHeight: minTileHeight,
        onTap: onTap,
      ),
    );
  }

  Widget _buildCupertino(BuildContext context) {
    final forcePressColor = this.forcePressColor == true;
    return PlatformInkWell(
      forcePressColor: forcePressColor,
      pressBgColor: pressBgColor,
      onTap: onTap,
      child: Material(
        color: Colors.transparent,
        child: ListTile(
          contentPadding: padding ??
              EdgeInsets.only(
                left: 20.0,
                right: 20.0,
              ),
          leading: leading,
          minTileHeight: minTileHeight ?? 48,
          title: title,
          trailing: trailing,
          subtitle: subtitle,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, platform) => _buildMaterial(context),
      cupertino: (context, platform) => _buildCupertino(context),
    );
  }
}

class PlatformListView extends StatelessWidget {
  const PlatformListView({
    super.key,
    this.children,
    this.footer,
    this.header,
    this.padding,
    this.headerPadding,
    this.footerPadding,
    this.decoration,
    this.dividerMargin,
    this.hasLeading = false,
    this.insetGrouped = false,
    this.topMargin = 22.0,
    this.separatorColor,
    this.backgroundColor,
    this.itemBuilder,
    this.separatorBuilder,
    this.itemCount = 0,
  });
  final bool insetGrouped;

  final List<Widget>? children;
  final Widget? footer;
  final Widget? header;
  final EdgeInsets? padding;
  final EdgeInsetsGeometry? headerPadding;
  final EdgeInsetsGeometry? footerPadding;

  final BoxDecoration? decoration;
  final double? dividerMargin;
  final bool hasLeading;
  final double topMargin;

  final Color? backgroundColor;
  final Color? separatorColor;

  final NullableIndexedWidgetBuilder? itemBuilder;
  final IndexedWidgetBuilder? separatorBuilder;
  final int itemCount;

  Widget? _buildHeader(BuildContext context) {
    if (header == null) return null;
    final colorScheme = ThemeColors.getColorScheme(context);
    return Container(
      padding: headerPadding ??
          EdgeInsets.only(
            top: 10,
            bottom: 10,
            left: insetGrouped ? 25 : 10,
            right: insetGrouped ? 25 : 10,
          ),
      child: DefaultTextStyle(
        style: TextStyle(
          color: ThemeColors.getTextColor(colorScheme),
          fontSize: 15,
        ),
        child: header!,
      ),
    );
  }

  Widget? _buildFooter(BuildContext context) {
    if (footer == null) return null;
    return Container(
      padding: footerPadding ??
          EdgeInsets.symmetric(
            horizontal: 16.0,
            vertical: 8.0,
          ),
      child: footer,
    );
  }

  Widget _buildInsetGrouped(BuildContext context) {
    return Column(
      children: [
        if (header != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: EdgeInsets.only(top: topMargin + (padding?.top ?? 0.0)),
              child: _buildHeader(context),
            ),
          ),
        CupertinoListSection.insetGrouped(
          dividerMargin: dividerMargin ?? 14.0,
          hasLeading: hasLeading,
          margin: EdgeInsets.only(
            top: 0,
            bottom: padding?.bottom ?? 10,
            left: padding?.left ?? 20,
            right: padding?.right ?? 20,
          ),
          topMargin: header != null ? 0 : topMargin,
          backgroundColor: backgroundColor ?? Colors.transparent,
          separatorColor: separatorColor,
          decoration: decoration,
          footer: _buildFooter(context),
          children: children,
        ),
      ],
    );
  }

  Widget _buildListView(BuildContext context) {
    return Column(
      children: [
        if (header != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: EdgeInsets.only(top: topMargin),
              child: _buildHeader(context),
            ),
          ),
        CupertinoListSection(
          dividerMargin: dividerMargin ?? 14.0,
          hasLeading: hasLeading,
          margin: padding ?? EdgeInsets.only(bottom: 8.0),
          topMargin: header != null ? 0 : topMargin,
          backgroundColor: backgroundColor ?? Colors.transparent,
          separatorColor: separatorColor,
          decoration: decoration,
          footer: _buildFooter(context),
          children: children,
        )
      ],
    );
  }

  Widget _buildCupertino(BuildContext context) {
    return insetGrouped ? _buildInsetGrouped(context) : _buildListView(context);
  }

  Widget _buildBuilder(BuildContext context) {
    return Column(
      children: [
        if (header != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: EdgeInsets.only(top: topMargin),
              child: _buildHeader(context),
            ),
          ),
        ListView.separated(
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
          padding: padding ??
              EdgeInsets.only(
                top: header != null ? 0.0 : (padding?.top ?? 0 + topMargin),
                bottom: footer != null ? 0.0 : padding?.bottom ?? 10.0,
                left: padding?.left ?? 0,
                right: padding?.right ?? 0,
              ),
          itemBuilder: itemBuilder!,
          separatorBuilder: separatorBuilder ??
              (context, index) {
                final Color dividerColor = separatorColor ??
                    CupertinoColors.separator.resolveFrom(context);
                final double dividerHeight =
                    1.0 / MediaQuery.devicePixelRatioOf(context);
                return Container(
                  margin:
                      EdgeInsetsDirectional.only(start: dividerMargin ?? 14.0),
                  color: dividerColor,
                  height: dividerHeight,
                );
              },
          itemCount: itemCount,
        ),
        if (footer != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: EdgeInsets.only(top: padding?.bottom ?? 10),
              child: _buildFooter(context)!,
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (itemBuilder != null) {
      return _buildBuilder(context);
    }
    return PlatformWidget(
      material: (context, platform) => _buildCupertino(context),
      cupertino: (context, platform) => _buildCupertino(context),
    );
  }
}
