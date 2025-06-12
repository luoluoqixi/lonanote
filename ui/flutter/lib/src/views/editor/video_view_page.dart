import 'dart:io';

import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:video_player/video_player.dart';

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
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;

  @override
  void initState() {
    super.initState();
    _videoPlayerController = VideoPlayerController.file(File(widget.path))
      ..initialize().then((_) {
        setState(() {
          _chewieController = ChewieController(
            videoPlayerController: _videoPlayerController,
            autoPlay: true,
            looping: false,
            allowPlaybackSpeedChanging: true,
            aspectRatio: _videoPlayerController.value.aspectRatio,
          );
        });
      });
  }

  @override
  void dispose() {
    _videoPlayerController.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);

    return PlatformSimplePage(
      titleText: name,
      noScrollView: true,
      child: SafeArea(
        bottom: true,
        top: false,
        left: false,
        right: false,
        child: _chewieController != null &&
                _chewieController!.videoPlayerController.value.isInitialized
            ? AspectRatio(
                aspectRatio: _chewieController!.aspectRatio!,
                child: Chewie(controller: _chewieController!),
              )
            : const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
