import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class SvgIcons {
  SvgIcons._();

  static const defaultWidth = 42.0;
  static const defaultHeight = 42.0;
  static const iconFolder = 'assets/icons/svg';
  static const Color defaultColor = Colors.white;

  static SvgPicture _getIcon(
    String path,
    Color color,
    double width,
    double height,
  ) {
    return SvgPicture.asset(
      '$iconFolder/$path',
      width: width,
      height: height,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  static SvgPicture ad({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'ad.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture markdown({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'markdown.svg',
      color,
      width,
      height,
    );
  }
}
