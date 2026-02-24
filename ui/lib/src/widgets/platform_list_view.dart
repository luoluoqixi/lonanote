import 'package:flutter/cupertino.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_ink_well.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:pull_down_button/pull_down_button.dart';

class PlatformPullDownListTile extends StatelessWidget {
  final String? selectValue;

  final List<Widget>? selectWidgets;
  final Widget? selectIcon;

  final PullDownMenuItemBuilder itemBuilder;

  final Widget? leading;
  final Widget title;
  final Widget? subtitle;

  final EdgeInsets? padding;
  final double? minTileHeight;

  final Color? pressBgColor;
  final bool? forcePressColor;

  const PlatformPullDownListTile({
    super.key,
    required this.title,
    required this.itemBuilder,
    this.selectValue,
    this.selectWidgets,
    this.selectIcon,
    this.leading,
    this.subtitle,
    this.minTileHeight,
    this.padding,
    this.pressBgColor,
    this.forcePressColor,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformPullDownButton(
      itemBuilder: itemBuilder,
      buttonBuilder: (context, showMenu) => PlatformListTileRaw(
        title: title,
        onTap: showMenu,
        leading: leading,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ...?selectWidgets,
            if (selectValue != null)
              Text(
                selectValue!,
                style: TextStyle(
                  fontSize: 14,
                  color: ThemeColors.getTextGreyColor(colorScheme),
                ),
              ),
            const SizedBox(width: 8),
            selectIcon ?? Icon(ThemeIcons.keyboardArrowDown(context)),
          ],
        ),
      ),
    );
  }
}

class PlatformSwitchListTile extends StatelessWidget {
  final ValueChanged<bool>? onChanged;
  final bool value;
  final Color? switchActiveColor;
  final DragStartBehavior? switchDragStartBehavior;
  final WidgetStateProperty<Icon?>? switchThumbIcon;
  final WidgetStateProperty<Color?>? switchTrackOutlineColor;
  final WidgetStateProperty<double?>? switchTrackOutlineWidth;
  final ImageErrorListener? switchOnActiveThumbImageError;
  final ImageErrorListener? switchOnInactiveThumbImageError;
  final Color? switchActiveTrackColor;
  final Color? switchInactiveThumbColor;
  final Color? switchInactiveTrackColor;
  final ImageProvider? switchActiveThumbImage;
  final ImageProvider? switchInactiveThumbImage;

  final PlatformBuilder<MaterialSwitchData>? switchMaterial;
  final PlatformBuilder<CupertinoSwitchData>? switchCupertino;

  final Widget? leading;
  final Widget title;
  final Widget? subtitle;

  final EdgeInsets? padding;
  final double? minTileHeight;

  final Color? pressBgColor;
  final bool? forcePressColor;

  const PlatformSwitchListTile({
    super.key,
    this.leading,
    this.onChanged,
    this.switchActiveColor,
    this.switchDragStartBehavior,
    this.switchThumbIcon,
    this.switchTrackOutlineColor,
    this.switchTrackOutlineWidth,
    this.switchOnActiveThumbImageError,
    this.switchOnInactiveThumbImageError,
    this.switchActiveTrackColor,
    this.switchInactiveThumbColor,
    this.switchInactiveTrackColor,
    this.switchActiveThumbImage,
    this.switchInactiveThumbImage,
    this.switchMaterial,
    this.switchCupertino,
    required this.value,
    required this.title,
    this.subtitle,
    this.minTileHeight,
    this.padding,
    this.pressBgColor,
    this.forcePressColor,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformListTileRaw(
      title: title,
      subtitle: subtitle,
      minTileHeight: minTileHeight,
      padding: padding,
      pressBgColor: pressBgColor,
      forcePressColor: forcePressColor,
      trailing: PlatformSwitch(
        value: value,
        onChanged: onChanged,
        activeColor: switchActiveColor,
        dragStartBehavior: switchDragStartBehavior,
        thumbIcon: switchThumbIcon,
        trackOutlineColor: switchTrackOutlineColor,
        trackOutlineWidth: switchTrackOutlineWidth,
        onActiveThumbImageError: switchOnActiveThumbImageError,
        onInactiveThumbImageError: switchOnInactiveThumbImageError,
        activeTrackColor: switchActiveTrackColor,
        inactiveThumbColor: switchInactiveThumbColor,
        inactiveTrackColor: switchInactiveTrackColor,
        activeThumbImage: switchActiveThumbImage,
        inactiveThumbImage: switchInactiveThumbImage,
        material: switchMaterial,
        cupertino: switchCupertino ??
            (context, platform) => CupertinoSwitchData(
                  activeTrackColor: ThemeColors.getPrimaryColor(colorScheme),
                ),
      ),
      onTap: onChanged != null
          ? () {
              HapticFeedback.selectionClick();
              onChanged!(!value);
            }
          : null,
    );
  }
}

class PlatformListTileRaw extends StatelessWidget {
  final Widget? leading;
  final Widget title;
  final Widget? trailing;
  final Widget? subtitle;

  final EdgeInsets? padding;
  final double? minTileHeight;

  final GestureTapCallback? onTap;
  final GestureLongPressCallback? onLongPress;

  final Color? bgColor;
  final Color? pressBgColor;
  final bool? forcePressColor;

  const PlatformListTileRaw({
    super.key,
    this.leading,
    required this.title,
    this.trailing,
    this.subtitle,
    this.minTileHeight,
    this.padding,
    this.onTap,
    this.onLongPress,
    this.bgColor,
    this.pressBgColor,
    this.forcePressColor,
  });

  Widget _buildMaterial(BuildContext context) {
    final forcePressColor = this.forcePressColor == true;
    final colorScheme = ThemeColors.getColorScheme(context);
    return Material(
      color: forcePressColor
          ? (pressBgColor ??
              ThemeColors.getPressBgColor(ThemeColors.getColorScheme(context)))
          : (bgColor ?? ThemeColors.getBg1Color(colorScheme)),
      child: ListTile(
        contentPadding: padding,
        leading: leading,
        title: title,
        trailing: trailing,
        subtitle: subtitle,
        minTileHeight: minTileHeight,
        onTap: onTap,
        onLongPress: onLongPress,
      ),
    );
  }

  Widget _buildCupertino(BuildContext context) {
    final forcePressColor = this.forcePressColor == true;
    return PlatformInkWell(
      forcePressColor: forcePressColor,
      pressBgColor: pressBgColor,
      bgColor: bgColor,
      onTap: onTap,
      onLongPress: onLongPress,
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

  final Widget Function(BuildContext context, int index)? itemBuilder;
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
          decoration: decoration ??
              BoxDecoration(
                color: backgroundColor ?? Colors.transparent,
              ),
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
    List<Widget> itemWidgets = [];
    for (int i = 0; i < itemCount; i++) {
      itemWidgets.add(itemBuilder!(context, i));
      if (i != itemCount - 1) {
        itemWidgets.add(
          separatorBuilder != null
              ? separatorBuilder!(context, i)
              : Container(
                  margin:
                      EdgeInsetsDirectional.only(start: dividerMargin ?? 14.0),
                  color: separatorColor ??
                      CupertinoColors.separator.resolveFrom(context),
                  height: 1.0 / MediaQuery.devicePixelRatioOf(context),
                ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (header != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: EdgeInsets.only(top: topMargin),
              child: _buildHeader(context),
            ),
          ),
        Padding(
          padding: padding ??
              EdgeInsets.only(
                top: header != null ? 0.0 : (padding?.top ?? 0 + topMargin),
                bottom: footer != null ? 0.0 : padding?.bottom ?? 10.0,
                left: padding?.left ?? 0,
                right: padding?.right ?? 0,
              ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: itemWidgets,
          ),
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
