import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:lonanote/src/rust/api/simple.dart';

class Index extends ConsumerStatefulWidget {
  const Index({super.key});

  @override
  ConsumerState<Index> createState() => _IndexState();
}

class _IndexState extends ConsumerState<Index>
    with SingleTickerProviderStateMixin {
  @override
  Widget build(BuildContext context) {
    return Text(
      'Action: Call Rust `greet("Tom")`\nResult: `${greet(name: "Tom")}`',
    );
  }
}
