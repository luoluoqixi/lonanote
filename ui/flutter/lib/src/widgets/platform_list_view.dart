import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';

class CupertinoListRawTileData {
  CupertinoListRawTileData({
    this.backgroundColor,
    this.backgroundColorActivated,
    this.minHeight,
    this.onTap,
    this.padding,
  });

  final Color? backgroundColor;
  final Color? backgroundColorActivated;
  final double? minHeight;
  final FutureOr<void> Function()? onTap;
  final EdgeInsetsGeometry? padding;
}

class MaterialListRawTileData {
  MaterialListRawTileData({
    this.focusColor,
    this.highlightColor,
    this.hoverColor,
    this.minHeight,
    this.onTap,
    this.overlayColor,
    this.padding,
    this.splashColor,
  });

  final Color? focusColor;
  final Color? highlightColor;
  final Color? hoverColor;
  final double? minHeight;
  final FutureOr<void> Function()? onTap;
  final WidgetStateProperty<Color?>? overlayColor;
  final EdgeInsetsGeometry? padding;
  final Color? splashColor;
}

class PlatformListRawTile extends StatefulWidget {
  const PlatformListRawTile({
    super.key,
    this.backgroundColor,
    this.backgroundColorActivated,
    required this.child,
    this.cupertino,
    this.material,
    this.minHeight,
    this.onTap,
    this.padding,
    this.style,
  });

  final Color? backgroundColor;
  final Color? backgroundColorActivated;
  final Widget child;
  final PlatformBuilder<CupertinoListRawTileData>? cupertino;
  final PlatformBuilder<MaterialListRawTileData>? material;
  final double? minHeight;
  final FutureOr<void> Function()? onTap;
  final EdgeInsetsGeometry? padding;
  final TextStyle? style;

  @override
  State<PlatformListRawTile> createState() => _PlatformListRawTileState();
}

class _PlatformListRawTileState extends State<PlatformListRawTile> {
  bool _tappedCupertino = false;

  static const double _kCupertinoMinHeight = 44.0;
  static const EdgeInsetsGeometry _kCupertinoPadding =
      EdgeInsetsDirectional.only(start: 20.0, top: 6.0, end: 14.0, bottom: 6.0);
  static const double _kMaterialMinHeight = 56.0;
  static const EdgeInsetsGeometry _kMaterialPadding = EdgeInsets.all(16.0);

  @override
  Widget build(BuildContext context) {
    final bool onMaterial = isMaterial(context);
    final MaterialListRawTileData? materialData =
        onMaterial ? widget.material?.call(context, platform(context)) : null;
    final CupertinoListRawTileData? cupertinoData =
        !onMaterial ? widget.cupertino?.call(context, platform(context)) : null;
    final TextStyle? style = widget.style ??
        (onMaterial
            ? Theme.of(context).textTheme.bodyLarge
            : CupertinoTheme.of(context).textTheme.textStyle);
    final Padding innerChild = Padding(
        padding:
            (onMaterial ? materialData?.padding : cupertinoData?.padding) ??
                widget.padding ??
                (onMaterial ? _kMaterialPadding : _kCupertinoPadding),
        child: Row(children: <Widget>[
          Expanded(
            child: style != null
                ? DefaultTextStyle(style: style, child: widget.child)
                : widget.child,
          )
        ]));
    final Container child = Container(
        constraints: BoxConstraints(
            minWidth: double.infinity,
            minHeight: (onMaterial
                    ? materialData?.minHeight
                    : cupertinoData?.minHeight) ??
                widget.minHeight ??
                (onMaterial ? _kMaterialMinHeight : _kCupertinoMinHeight)),
        child: onMaterial
            ? Ink(color: widget.backgroundColor, child: innerChild)
            : Container(
                color: _tappedCupertino
                    ? cupertinoData?.backgroundColorActivated ??
                        widget.backgroundColorActivated ??
                        CupertinoColors.systemGrey4.resolveFrom(context)
                    : cupertinoData?.backgroundColor ?? widget.backgroundColor,
                child: innerChild));

    if ((onMaterial && materialData?.onTap == null) &&
        (!onMaterial && cupertinoData?.onTap == null) &&
        widget.onTap == null) {
      return child;
    }

    return onMaterial
        ? InkWell(
            onTap: materialData?.onTap ?? widget.onTap,
            focusColor:
                materialData?.focusColor ?? widget.backgroundColorActivated,
            highlightColor:
                materialData?.highlightColor ?? widget.backgroundColorActivated,
            hoverColor: materialData?.hoverColor,
            overlayColor: materialData?.overlayColor,
            splashColor: materialData?.splashColor,
            child: child,
          )
        : GestureDetector(
            onTapDown: (_) => setState(() {
              _tappedCupertino = true;
            }),
            onTapCancel: () => setState(() {
              _tappedCupertino = false;
            }),
            onTap: () async {
              if (cupertinoData?.onTap != null) {
                await cupertinoData!.onTap!();
              } else {
                await widget.onTap!();
              }
              if (mounted) {
                setState(() {
                  _tappedCupertino = false;
                });
              }
            },
            behavior: HitTestBehavior.opaque,
            child: child,
          );
  }
}

class CupertinoListViewData {
  const CupertinoListViewData({
    this.backgroundColor,
    this.dividerMargin,
    this.hasLeading,
    this.margin,
  });

  final Color? backgroundColor;
  final double? dividerMargin;
  final bool? hasLeading;
  final EdgeInsetsGeometry? margin;
}

class MaterialListViewData {
  const MaterialListViewData({
    this.footerPadding,
    this.headerPadding,
    this.margin,
  });

  final EdgeInsetsGeometry? footerPadding;
  final EdgeInsetsGeometry? headerPadding;
  final EdgeInsetsGeometry? margin;
}

class PlatformListView
    extends PlatformWidgetBase<CupertinoListSection, Column> {
  const PlatformListView({
    super.key,
    required this.children,
    this.cupertino,
    this.footer,
    this.header,
    this.margin,
    this.material,
  });
  final List<Widget> children;
  final PlatformBuilder<CupertinoListViewData>? cupertino;
  final Widget? footer;
  final Widget? header;
  final PlatformBuilder<MaterialListViewData>? material;
  final EdgeInsetsGeometry? margin;

  static const EdgeInsetsGeometry _kMaterialFooterPadding =
      EdgeInsets.symmetric(
    horizontal: 16.0,
    vertical: 8.0,
  );
  static const EdgeInsetsGeometry _kMaterialHeaderPadding =
      EdgeInsets.symmetric(
    horizontal: 16.0,
    vertical: 8.0,
  );

  @override
  CupertinoListSection createCupertinoWidget(BuildContext context) {
    final data = cupertino?.call(context, platform(context));
    return CupertinoListSection.insetGrouped(
      dividerMargin: data?.dividerMargin ?? 14.0,
      hasLeading: data?.hasLeading ?? false,
      margin: data?.margin ?? margin,
      backgroundColor: data?.backgroundColor ?? Colors.transparent,
      header: header,
      footer: footer,
      children: [...children],
    );
  }

  @override
  Column createMaterialWidget(BuildContext context) {
    final data = material?.call(context, platform(context));
    final ThemeData theme = Theme.of(context);
    final TextStyle? decorationStyle =
        theme.textTheme.bodyMedium?.apply(fontWeightDelta: 2);
    return Column(children: <Widget>[
      ListView(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: data?.margin ?? margin,
        children: [
          if (header != null)
            Container(
              padding: data?.headerPadding ?? _kMaterialHeaderPadding,
              child: decorationStyle != null
                  ? DefaultTextStyle(style: decorationStyle, child: header!)
                  : header,
            ),
          ...children,
          if (footer != null)
            Container(
              padding: data?.footerPadding ?? _kMaterialFooterPadding,
              child: decorationStyle != null
                  ? DefaultTextStyle(style: decorationStyle, child: footer!)
                  : footer,
            ),
        ],
      )
    ]);
  }
}
