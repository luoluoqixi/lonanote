import 'package:hooks_riverpod/hooks_riverpod.dart';

class OpenFileInfo {
  final String fullPath;
  final String path;

  const OpenFileInfo({
    required this.fullPath,
    required this.path,
  });
}

final currentOpenFileProvider = StateProvider<OpenFileInfo?>((ref) => null);
