import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class NotSupportFilePage extends ConsumerStatefulWidget {
  const NotSupportFilePage({
    super.key,
    required this.path,
    this.onBack,
  });

  final String path;
  final VoidCallback? onBack;

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
      leading: widget.onBack != null
          ? IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: widget.onBack,
            )
          : null,
      child: Center(
        child: SizedBox(height: 300, child: Center(child: Text("不支持查看的文件"))),
      ),
    );
  }
}
