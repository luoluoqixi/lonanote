import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class SvgIcons {
  SvgIcons._();

  static SvgPicture ad({
    Color color = Colors.white,
    double width = 42,
    double height = 42,
  }) {
    return SvgPicture.asset(
      'assets/icons/svg/ad.svg',
      width: width,
      height: height,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  static SvgPicture markdown({
    Color color = Colors.white,
    double width = 42,
    double height = 42,
  }) {
    return SvgPicture.asset(
      'assets/icons/svg/markdown.svg',
      width: width,
      height: height,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }
}
