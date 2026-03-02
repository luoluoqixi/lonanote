// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'router.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RouterStore {
  String? get currentPage;
  bool get hideGlobalFloatingToolbar;
  bool get canPop;

  /// Create a copy of RouterStore
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $RouterStoreCopyWith<RouterStore> get copyWith =>
      _$RouterStoreCopyWithImpl<RouterStore>(this as RouterStore, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is RouterStore &&
            (identical(other.currentPage, currentPage) ||
                other.currentPage == currentPage) &&
            (identical(other.hideGlobalFloatingToolbar,
                    hideGlobalFloatingToolbar) ||
                other.hideGlobalFloatingToolbar == hideGlobalFloatingToolbar) &&
            (identical(other.canPop, canPop) || other.canPop == canPop));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, currentPage, hideGlobalFloatingToolbar, canPop);

  @override
  String toString() {
    return 'RouterStore(currentPage: $currentPage, hideGlobalFloatingToolbar: $hideGlobalFloatingToolbar, canPop: $canPop)';
  }
}

/// @nodoc
abstract mixin class $RouterStoreCopyWith<$Res> {
  factory $RouterStoreCopyWith(
          RouterStore value, $Res Function(RouterStore) _then) =
      _$RouterStoreCopyWithImpl;
  @useResult
  $Res call({String? currentPage, bool hideGlobalFloatingToolbar, bool canPop});
}

/// @nodoc
class _$RouterStoreCopyWithImpl<$Res> implements $RouterStoreCopyWith<$Res> {
  _$RouterStoreCopyWithImpl(this._self, this._then);

  final RouterStore _self;
  final $Res Function(RouterStore) _then;

  /// Create a copy of RouterStore
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? currentPage = freezed,
    Object? hideGlobalFloatingToolbar = null,
    Object? canPop = null,
  }) {
    return _then(_self.copyWith(
      currentPage: freezed == currentPage
          ? _self.currentPage
          : currentPage // ignore: cast_nullable_to_non_nullable
              as String?,
      hideGlobalFloatingToolbar: null == hideGlobalFloatingToolbar
          ? _self.hideGlobalFloatingToolbar
          : hideGlobalFloatingToolbar // ignore: cast_nullable_to_non_nullable
              as bool,
      canPop: null == canPop
          ? _self.canPop
          : canPop // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [RouterStore].
extension RouterStorePatterns on RouterStore {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_RouterStore value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _RouterStore() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_RouterStore value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _RouterStore():
        return $default(_that);
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_RouterStore value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _RouterStore() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            String? currentPage, bool hideGlobalFloatingToolbar, bool canPop)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _RouterStore() when $default != null:
        return $default(
            _that.currentPage, _that.hideGlobalFloatingToolbar, _that.canPop);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            String? currentPage, bool hideGlobalFloatingToolbar, bool canPop)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _RouterStore():
        return $default(
            _that.currentPage, _that.hideGlobalFloatingToolbar, _that.canPop);
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            String? currentPage, bool hideGlobalFloatingToolbar, bool canPop)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _RouterStore() when $default != null:
        return $default(
            _that.currentPage, _that.hideGlobalFloatingToolbar, _that.canPop);
      case _:
        return null;
    }
  }
}

/// @nodoc

class _RouterStore implements RouterStore {
  const _RouterStore(
      {required this.currentPage,
      required this.hideGlobalFloatingToolbar,
      required this.canPop});

  @override
  final String? currentPage;
  @override
  final bool hideGlobalFloatingToolbar;
  @override
  final bool canPop;

  /// Create a copy of RouterStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$RouterStoreCopyWith<_RouterStore> get copyWith =>
      __$RouterStoreCopyWithImpl<_RouterStore>(this, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _RouterStore &&
            (identical(other.currentPage, currentPage) ||
                other.currentPage == currentPage) &&
            (identical(other.hideGlobalFloatingToolbar,
                    hideGlobalFloatingToolbar) ||
                other.hideGlobalFloatingToolbar == hideGlobalFloatingToolbar) &&
            (identical(other.canPop, canPop) || other.canPop == canPop));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, currentPage, hideGlobalFloatingToolbar, canPop);

  @override
  String toString() {
    return 'RouterStore(currentPage: $currentPage, hideGlobalFloatingToolbar: $hideGlobalFloatingToolbar, canPop: $canPop)';
  }
}

/// @nodoc
abstract mixin class _$RouterStoreCopyWith<$Res>
    implements $RouterStoreCopyWith<$Res> {
  factory _$RouterStoreCopyWith(
          _RouterStore value, $Res Function(_RouterStore) _then) =
      __$RouterStoreCopyWithImpl;
  @override
  @useResult
  $Res call({String? currentPage, bool hideGlobalFloatingToolbar, bool canPop});
}

/// @nodoc
class __$RouterStoreCopyWithImpl<$Res> implements _$RouterStoreCopyWith<$Res> {
  __$RouterStoreCopyWithImpl(this._self, this._then);

  final _RouterStore _self;
  final $Res Function(_RouterStore) _then;

  /// Create a copy of RouterStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? currentPage = freezed,
    Object? hideGlobalFloatingToolbar = null,
    Object? canPop = null,
  }) {
    return _then(_RouterStore(
      currentPage: freezed == currentPage
          ? _self.currentPage
          : currentPage // ignore: cast_nullable_to_non_nullable
              as String?,
      hideGlobalFloatingToolbar: null == hideGlobalFloatingToolbar
          ? _self.hideGlobalFloatingToolbar
          : hideGlobalFloatingToolbar // ignore: cast_nullable_to_non_nullable
              as bool,
      canPop: null == canPop
          ? _self.canPop
          : canPop // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

// dart format on
