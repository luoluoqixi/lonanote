import 'package:flutter/material.dart';
import 'package:lonanote/src/icons/editor_action_icons.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_list_grid.dart';

enum EditorAddActionValues {
  text,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,

  quote,
  divider,

  bulletList,
  orderedList,
  taskList,

  imageBlock,
  imageInline,
  codeBlock,
  table,
  math,
}

Widget _getEditorActionIcon(BuildContext context, EditorAddActionValues value) {
  final colorScheme = ThemeColors.getColorScheme(context);
  final iconColor = ThemeColors.getTextColor(colorScheme);
  final width = 36.0;
  final height = 36.0;
  switch (value) {
    case EditorAddActionValues.text:
      return EditorActionIcons.text(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h1:
      return EditorActionIcons.h1(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h2:
      return EditorActionIcons.h2(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h3:
      return EditorActionIcons.h3(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h4:
      return EditorActionIcons.h4(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h5:
      return EditorActionIcons.h5(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.h6:
      return EditorActionIcons.h6(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.quote:
      return EditorActionIcons.quote(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.divider:
      return EditorActionIcons.divider(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.bulletList:
      return EditorActionIcons.bulletList(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.orderedList:
      return EditorActionIcons.orderedList(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.taskList:
      return EditorActionIcons.taskList(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.imageBlock:
      return EditorActionIcons.imageBlock(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.imageInline:
      return EditorActionIcons.imageInline(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.codeBlock:
      return EditorActionIcons.codeBlock(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.table:
      return EditorActionIcons.table(
          color: iconColor, width: width, height: height);
    case EditorAddActionValues.math:
      return EditorActionIcons.math(
          color: iconColor, width: width, height: height);
  }
}

final List<PlatformListGridItem> editorAddActionItems = [
  PlatformListGridItem(
    value: EditorAddActionValues.text.index,
    title: "文本",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.text),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h1.index,
    title: "一级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h1),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h2.index,
    title: "二级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h2),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h3.index,
    title: "三级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h3),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h4.index,
    title: "四级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h4),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h5.index,
    title: "五级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h5),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.h6.index,
    title: "六级标题",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.h6),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.quote.index,
    title: "引用",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.quote),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.divider.index,
    title: "分割线",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.divider),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.bulletList.index,
    title: "无序列表",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.bulletList),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.orderedList.index,
    title: "有序列表",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.orderedList),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.taskList.index,
    title: "待办列表",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.taskList),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.imageBlock.index,
    title: "图片",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.imageBlock),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.imageInline.index,
    title: "图片链接",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.imageInline),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.codeBlock.index,
    title: "代码块",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.codeBlock),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.table.index,
    title: "表格",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.table),
  ),
  PlatformListGridItem(
    value: EditorAddActionValues.math.index,
    title: "数学公式",
    getIcon: (context) =>
        _getEditorActionIcon(context, EditorAddActionValues.math),
  ),
];

class EditorAddToolbar extends StatelessWidget {
  final void Function(int value)? onAction;

  const EditorAddToolbar({
    super.key,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return PlatformListGrid(
      items: editorAddActionItems,
      onChange: (val) {
        onAction?.call(val);
      },
      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 20),
      galleryMode: true,
      galleryRowCount: 4,
      galleryCrossAxisSpacing: 14,
      galleryMainAxisSpacing: 14,
    );
  }
}
