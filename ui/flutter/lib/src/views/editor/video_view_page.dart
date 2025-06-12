import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class VideoViewPage extends ConsumerStatefulWidget {
  const VideoViewPage({
    super.key,
    required this.path,
  });

  final String path;

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _VideoViewPageState();
}

class _VideoViewPageState extends ConsumerState<VideoViewPage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);

    return PlatformSimplePage(
      titleText: name,
      noScrollView: true,
      child: Text("video"),
    );
  }
}
