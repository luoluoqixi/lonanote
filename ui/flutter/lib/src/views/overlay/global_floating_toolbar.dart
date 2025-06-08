import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/providers/router/router.dart';
import 'package:lonanote/src/providers/settings/settings.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_floating_toolbar.dart';
import 'package:lonanote/src/widgets/platform_icon_btn.dart';

final floatingToolbarEventProvider =
    StateProvider<FloatingToolbarEvent?>((ref) => null);

class FloatingToolbarEvent {
  final String type;
  final dynamic payload;

  FloatingToolbarEvent(this.type, {this.payload});
}

class GlobalFloatingToolbar extends ConsumerStatefulWidget {
  static OverlayEntry? _entry;
  const GlobalFloatingToolbar({super.key});

  @override
  ConsumerState<GlobalFloatingToolbar> createState() =>
      _GlobalFloatingToolbarState();

  static OverlayEntry buildOverlay(BuildContext context) {
    return OverlayEntry(
      builder: (context) => Stack(
        children: const [
          GlobalFloatingToolbar(),
        ],
      ),
    );
  }

  static void initOverlay(BuildContext context) {
    if (_entry != null) return;
    final overlay = buildOverlay(context);
    Overlay.of(context, rootOverlay: true).insert(overlay);
    _entry = overlay;
  }

  static void show() {
    if (_entry == null) return;
  }

  static void hide() {
    if (_entry == null) return;
  }
}

class _GlobalFloatingToolbarState extends ConsumerState<GlobalFloatingToolbar> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  static bool isShowToolbar(String? page) {
    if (page == null) return false;
    if (page == "/workspace_files" || page == "/workspace_home") {
      return true;
    }
    return false;
  }

  FloatingToolbarEvent sendEvent(String eventName, dynamic payload) {
    return ref.read(floatingToolbarEventProvider.notifier).state =
        FloatingToolbarEvent(eventName, payload: payload);
  }

  @override
  Widget build(BuildContext context) {
    final otherSettings =
        ref.watch(settingsProvider.select((s) => s.otherSettings));
    final currentPage = ref.watch(routerProvider.select((s) => s.currentPage));
    final hideGlobalFloatingToolbar =
        ref.watch(routerProvider.select((s) => s.hideGlobalFloatingToolbar));
    final canPop = ref.watch(routerProvider.select((s) => s.canPop));
    final isShow = otherSettings.showFloatingToolbar &&
        !hideGlobalFloatingToolbar &&
        isShowToolbar(currentPage);

    return PlatformFloatingToolbar(
      fixedSize: true,
      visible: isShow,
      contentPadding: EdgeInsets.all(2),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            PlatformIconBtn(
              disable: !canPop,
              icon: Icon(
                ThemeIcons.arrowBackIos(context),
                size: 20,
              ),
              onPressed: () {
                HapticFeedback.selectionClick();
                if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                }
              },
            ),
            PlatformIconBtn(
              icon: Icon(
                ThemeIcons.add(context),
                size: 25,
              ),
              onPressed: () {
                HapticFeedback.selectionClick();
                sendEvent('add_file', null);
              },
            ),

            // todo: 以后在实现Search
            // PlatformIconBtn(
            //   icon: Icon(
            //     ThemeIcons.search(context),
            //     size: 25,
            //   ),
            //   onPressed: () {
            //     HapticFeedback.selectionClick();
            //     sendEvent('search', null);
            //   },
            // ),
          ],
        ),
      ],
    );
  }
}
