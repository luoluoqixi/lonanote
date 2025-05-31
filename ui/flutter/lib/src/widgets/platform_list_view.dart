import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformListTile extends StatelessWidget {
  final Widget? leading;
  final Widget? title;
  final Widget? trailing;
  final Widget? subtitle;

  final bool enabled;
  final GestureTapCallback? onTap;
  final GestureLongPressCallback? onLongPress;
  final ValueChanged<bool>? onFocusChange;

  final Color? textColor;
  final Color? iconColor;
  final Color? selectedColor;

  final Color? pressBgColor;
  final bool? forcePressColor;

  const PlatformListTile({
    super.key,
    this.leading,
    this.title,
    this.trailing,
    this.subtitle,
    this.enabled = true,
    this.onTap,
    this.onLongPress,
    this.onFocusChange,
    this.textColor,
    this.iconColor,
    this.selectedColor,
    this.pressBgColor,
    this.forcePressColor,
  });

  Widget _buildMaterial(BuildContext context) {
    final forcePressColor = this.forcePressColor == true;
    return Material(
      color: forcePressColor
          ? (pressBgColor ??
              ThemeColors.getPressBgColor(Theme.of(context).colorScheme))
          : Colors.transparent,
      child: ListTile(
        leading: leading,
        title: title,
        trailing: trailing,
        subtitle: subtitle,
        enabled: enabled,
        onTap: onTap,
        onLongPress: onLongPress,
        onFocusChange: onFocusChange,
        textColor: textColor,
        iconColor: iconColor,
        selectedColor: selectedColor,
      ),
    );
  }

  Widget _buildCupertino(BuildContext context) {
    // final data = cupertino?.call(context, platform(context));
    // return CupertinoListSection.insetGrouped(
    //   dividerMargin: data?.dividerMargin ?? 14.0,
    //   hasLeading: data?.hasLeading ?? false,
    //   margin: data?.margin ?? margin,
    //   backgroundColor: data?.backgroundColor ?? Colors.transparent,
    //   header: header,
    //   footer: footer,
    //   children: [...children],
    // );
    return Text("234");
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
    required this.children,
    this.footer,
    this.header,
    this.padding,
    this.headerPadding,
    this.footerPadding,
  });
  final List<Widget> children;
  final Widget? footer;
  final Widget? header;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? headerPadding;
  final EdgeInsetsGeometry? footerPadding;

  Widget _buildMaterial(BuildContext context) {
    return ListView(
      shrinkWrap: true,
      padding: padding,
      physics: NeverScrollableScrollPhysics(),
      children: [
        if (header != null)
          Container(
            padding: headerPadding ??
                EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 8.0,
                ),
            child: header,
          ),
        ...children,
        if (footer != null)
          Container(
            padding: footerPadding ??
                EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 8.0,
                ),
            child: footer,
          ),
      ],
    );
  }

  Widget _buildCupertino(BuildContext context) {
    // final data = cupertino?.call(context, platform(context));
    // return CupertinoListSection.insetGrouped(
    //   dividerMargin: data?.dividerMargin ?? 14.0,
    //   hasLeading: data?.hasLeading ?? false,
    //   margin: data?.margin ?? margin,
    //   backgroundColor: data?.backgroundColor ?? Colors.transparent,
    //   header: header,
    //   footer: footer,
    //   children: [...children],
    // );
    return Text("234");
  }

  @override
  Widget build(BuildContext context) {
    return PlatformWidget(
      material: (context, platform) => _buildMaterial(context),
      cupertino: (context, platform) => _buildCupertino(context),
    );
  }
}
