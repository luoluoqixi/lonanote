import 'dart:io';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';

class ImageViewPage extends ConsumerStatefulWidget {
  const ImageViewPage({
    super.key,
    required this.paths,
    required this.index,
  });

  final List<String> paths;
  final int index;

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _ImageViewPageState();
}

class _ImageViewPageState extends ConsumerState<ImageViewPage> {
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.index;
    _pageController = PageController(initialPage: _currentIndex);

    _pageController.addListener(() {
      final newIndex = _pageController.page?.round() ?? _currentIndex;
      if (newIndex != _currentIndex) {
        setState(() {
          _currentIndex = newIndex;
        });
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.paths.length;
    String? currentName;
    if (_currentIndex >= 0 && _currentIndex < count) {
      final currentPath = widget.paths[_currentIndex];
      currentName = Utility.getFileName(currentPath);
    }
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformSimplePage(
      titleText: currentName ?? "预览图片",
      noScrollView: true,
      child: Stack(
        children: [
          PhotoViewGallery.builder(
            pageController: _pageController,
            itemCount: widget.paths.length,
            builder: (context, index) {
              final path = widget.paths[index];
              return PhotoViewGalleryPageOptions(
                imageProvider: FileImage(File(path)),
                heroAttributes: PhotoViewHeroAttributes(tag: path),
                minScale: PhotoViewComputedScale.contained,
                maxScale: PhotoViewComputedScale.covered * 2.5,
                basePosition: const Alignment(0, -0.2),
              );
            },
            scrollPhysics: const BouncingScrollPhysics(),
            loadingBuilder: (context, _) =>
                const Center(child: CircularProgressIndicator()),
            backgroundDecoration:
                BoxDecoration(color: ThemeColors.getBgColor(colorScheme)),
          ),
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: true,
              top: false,
              left: false,
              right: false,
              child: Center(
                child: Text(
                  '${_currentIndex + 1} / ${widget.paths.length}',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
