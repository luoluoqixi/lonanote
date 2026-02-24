import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class EditorActionIcons {
  EditorActionIcons._();

  static const defaultWidth = 42.0;
  static const defaultHeight = 42.0;
  static const iconFolder = 'assets/icons/svg/actions';
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

  static SvgPicture text({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'text.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h1({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h1.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h2({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h2.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h3({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h3.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h4({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h4.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h5({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h5.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture h6({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'h6.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture quote({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'quote.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture divider({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'divider.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture bulletList({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'bullet-list.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture orderedList({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'ordered-list.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture taskList({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'task-list.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture link({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'link.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture imageBlock({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'image-block.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture imageInline({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'image-inline.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture codeBlock({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'code-block.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture table({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'table.svg',
      color,
      width,
      height,
    );
  }

  static SvgPicture math({
    Color color = defaultColor,
    double width = defaultWidth,
    double height = defaultHeight,
  }) {
    return _getIcon(
      'math.svg',
      color,
      width,
      height,
    );
  }
}
