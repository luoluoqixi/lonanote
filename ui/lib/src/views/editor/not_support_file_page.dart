import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class NotSupportFilePage extends ConsumerStatefulWidget {
  const NotSupportFilePage({
    super.key,
    required this.path,
  });

  final String path;

  @override
  ConsumerState<ConsumerStatefulWidget> createState() =>
      _NotSupportFilePageState();
}

class _NotSupportFilePageState extends ConsumerState<NotSupportFilePage> {
  @override
  Widget build(BuildContext context) {
    final name = Utility.getFileName(widget.path);

    return PlatformSimplePage(
      titleText: name,
      child: Center(
        child: SizedBox(height: 300, child: Center(child: Text("不支持查看的文件"))),
      ),
    );
  }
}
