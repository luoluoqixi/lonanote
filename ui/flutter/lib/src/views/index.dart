import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/views/workspace/select_workspace_page.dart';

class Index extends ConsumerStatefulWidget {
  const Index({super.key});

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _IndexState();
}

class _IndexState extends ConsumerState<Index> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return SelectWorkspacePage(
      initOpen: true,
    );
  }
}
