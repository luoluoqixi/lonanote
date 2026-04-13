import 'package:hooks_riverpod/hooks_riverpod.dart';

enum OpenFileType {
  editor,
  image,
  video,
  notSupported,
}

class OpenFileInfo {
  final String fullPath;
  final String path;
  final OpenFileType type;
  // 图片查看器专用
  final List<String>? imagePaths;
  final int? imageIndex;

  const OpenFileInfo({
    required this.fullPath,
    required this.path,
    required this.type,
    this.imagePaths,
    this.imageIndex,
  });
}

final currentOpenFileProvider = StateProvider<OpenFileInfo?>((ref) => null);
