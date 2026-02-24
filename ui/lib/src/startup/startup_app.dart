import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:lonanote/src/app.dart';

Future<void> startupApp() async {
  runApp(const ProviderScope(child: App()));
}
