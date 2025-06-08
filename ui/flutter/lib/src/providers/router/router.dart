import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'router.g.dart';
part 'router.freezed.dart';

@riverpod
class Router extends _$Router with WidgetsBindingObserver {
  @override
  RouterStore build() {
    return RouterStore(
      currentPage: null,
      canPop: false,
      hideGlobalFloatingToolbar: false,
    );
  }

  void setCurrentPage(String? value) {
    state = state.copyWith(
      currentPage: value,
    );
  }

  void updateCanPop(bool value) {
    state = state.copyWith(
      canPop: value,
    );
  }

  void setHideGlobalFloatingToolbar(bool value) {
    state = state.copyWith(
      hideGlobalFloatingToolbar: value,
    );
  }
}

@freezed
sealed class RouterStore with _$RouterStore {
  const factory RouterStore({
    required String? currentPage,
    required bool hideGlobalFloatingToolbar,
    required bool canPop,
  }) = _RouterStore;
}

class RouterNavigatorObserver extends NavigatorObserver {
  final WidgetRef ref;

  RouterNavigatorObserver(this.ref);

  void _updateCurrentPage(Route route) {
    final name = route.settings.name;
    // 延迟到下一帧再修改 provider 状态，避免在 build 阶段触发写操作
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(routerProvider.notifier).setCurrentPage(name);
    });
  }

  void _updateCanPop(NavigatorState navigator) {
    final canPop = navigator.canPop();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(routerProvider.notifier).updateCanPop(canPop);
    });
  }

  @override
  void didPush(Route route, Route? previousRoute) {
    _updateCurrentPage(route);
    _updateCanPop(navigator!);
  }

  @override
  void didReplace({Route? newRoute, Route? oldRoute}) {
    if (newRoute != null) _updateCurrentPage(newRoute);
    _updateCanPop(navigator!);
  }

  @override
  void didPop(Route route, Route? previousRoute) {
    if (previousRoute != null) _updateCurrentPage(previousRoute);
    _updateCanPop(navigator!);
  }

  @override
  void didRemove(Route route, Route? previousRoute) {
    super.didRemove(route, previousRoute);
    _updateCanPop(navigator!);
  }
}
