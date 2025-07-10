// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'workspace.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$WorkspaceStore {
  RustWorkspaceData? get currentWorkspace;
  List<RustWorkspaceMetadata>? get workspaces;
  bool? get isWorkspaceLoading;

  /// Create a copy of WorkspaceStore
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $WorkspaceStoreCopyWith<WorkspaceStore> get copyWith =>
      _$WorkspaceStoreCopyWithImpl<WorkspaceStore>(
          this as WorkspaceStore, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is WorkspaceStore &&
            (identical(other.currentWorkspace, currentWorkspace) ||
                other.currentWorkspace == currentWorkspace) &&
            const DeepCollectionEquality()
                .equals(other.workspaces, workspaces) &&
            (identical(other.isWorkspaceLoading, isWorkspaceLoading) ||
                other.isWorkspaceLoading == isWorkspaceLoading));
  }

  @override
  int get hashCode => Object.hash(runtimeType, currentWorkspace,
      const DeepCollectionEquality().hash(workspaces), isWorkspaceLoading);

  @override
  String toString() {
    return 'WorkspaceStore(currentWorkspace: $currentWorkspace, workspaces: $workspaces, isWorkspaceLoading: $isWorkspaceLoading)';
  }
}

/// @nodoc
abstract mixin class $WorkspaceStoreCopyWith<$Res> {
  factory $WorkspaceStoreCopyWith(
          WorkspaceStore value, $Res Function(WorkspaceStore) _then) =
      _$WorkspaceStoreCopyWithImpl;
  @useResult
  $Res call(
      {RustWorkspaceData? currentWorkspace,
      List<RustWorkspaceMetadata>? workspaces,
      bool? isWorkspaceLoading});
}

/// @nodoc
class _$WorkspaceStoreCopyWithImpl<$Res>
    implements $WorkspaceStoreCopyWith<$Res> {
  _$WorkspaceStoreCopyWithImpl(this._self, this._then);

  final WorkspaceStore _self;
  final $Res Function(WorkspaceStore) _then;

  /// Create a copy of WorkspaceStore
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? currentWorkspace = freezed,
    Object? workspaces = freezed,
    Object? isWorkspaceLoading = freezed,
  }) {
    return _then(_self.copyWith(
      currentWorkspace: freezed == currentWorkspace
          ? _self.currentWorkspace
          : currentWorkspace // ignore: cast_nullable_to_non_nullable
              as RustWorkspaceData?,
      workspaces: freezed == workspaces
          ? _self.workspaces
          : workspaces // ignore: cast_nullable_to_non_nullable
              as List<RustWorkspaceMetadata>?,
      isWorkspaceLoading: freezed == isWorkspaceLoading
          ? _self.isWorkspaceLoading
          : isWorkspaceLoading // ignore: cast_nullable_to_non_nullable
              as bool?,
    ));
  }
}

/// Adds pattern-matching-related methods to [WorkspaceStore].
extension WorkspaceStorePatterns on WorkspaceStore {
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
    TResult Function(_WorkspaceStore value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore() when $default != null:
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
    TResult Function(_WorkspaceStore value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore():
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
    TResult? Function(_WorkspaceStore value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore() when $default != null:
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
    TResult Function(RustWorkspaceData? currentWorkspace,
            List<RustWorkspaceMetadata>? workspaces, bool? isWorkspaceLoading)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore() when $default != null:
        return $default(
            _that.currentWorkspace, _that.workspaces, _that.isWorkspaceLoading);
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
    TResult Function(RustWorkspaceData? currentWorkspace,
            List<RustWorkspaceMetadata>? workspaces, bool? isWorkspaceLoading)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore():
        return $default(
            _that.currentWorkspace, _that.workspaces, _that.isWorkspaceLoading);
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
    TResult? Function(RustWorkspaceData? currentWorkspace,
            List<RustWorkspaceMetadata>? workspaces, bool? isWorkspaceLoading)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _WorkspaceStore() when $default != null:
        return $default(
            _that.currentWorkspace, _that.workspaces, _that.isWorkspaceLoading);
      case _:
        return null;
    }
  }
}

/// @nodoc

class _WorkspaceStore implements WorkspaceStore {
  const _WorkspaceStore(
      {this.currentWorkspace,
      final List<RustWorkspaceMetadata>? workspaces,
      this.isWorkspaceLoading})
      : _workspaces = workspaces;

  @override
  final RustWorkspaceData? currentWorkspace;
  final List<RustWorkspaceMetadata>? _workspaces;
  @override
  List<RustWorkspaceMetadata>? get workspaces {
    final value = _workspaces;
    if (value == null) return null;
    if (_workspaces is EqualUnmodifiableListView) return _workspaces;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final bool? isWorkspaceLoading;

  /// Create a copy of WorkspaceStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$WorkspaceStoreCopyWith<_WorkspaceStore> get copyWith =>
      __$WorkspaceStoreCopyWithImpl<_WorkspaceStore>(this, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _WorkspaceStore &&
            (identical(other.currentWorkspace, currentWorkspace) ||
                other.currentWorkspace == currentWorkspace) &&
            const DeepCollectionEquality()
                .equals(other._workspaces, _workspaces) &&
            (identical(other.isWorkspaceLoading, isWorkspaceLoading) ||
                other.isWorkspaceLoading == isWorkspaceLoading));
  }

  @override
  int get hashCode => Object.hash(runtimeType, currentWorkspace,
      const DeepCollectionEquality().hash(_workspaces), isWorkspaceLoading);

  @override
  String toString() {
    return 'WorkspaceStore(currentWorkspace: $currentWorkspace, workspaces: $workspaces, isWorkspaceLoading: $isWorkspaceLoading)';
  }
}

/// @nodoc
abstract mixin class _$WorkspaceStoreCopyWith<$Res>
    implements $WorkspaceStoreCopyWith<$Res> {
  factory _$WorkspaceStoreCopyWith(
          _WorkspaceStore value, $Res Function(_WorkspaceStore) _then) =
      __$WorkspaceStoreCopyWithImpl;
  @override
  @useResult
  $Res call(
      {RustWorkspaceData? currentWorkspace,
      List<RustWorkspaceMetadata>? workspaces,
      bool? isWorkspaceLoading});
}

/// @nodoc
class __$WorkspaceStoreCopyWithImpl<$Res>
    implements _$WorkspaceStoreCopyWith<$Res> {
  __$WorkspaceStoreCopyWithImpl(this._self, this._then);

  final _WorkspaceStore _self;
  final $Res Function(_WorkspaceStore) _then;

  /// Create a copy of WorkspaceStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? currentWorkspace = freezed,
    Object? workspaces = freezed,
    Object? isWorkspaceLoading = freezed,
  }) {
    return _then(_WorkspaceStore(
      currentWorkspace: freezed == currentWorkspace
          ? _self.currentWorkspace
          : currentWorkspace // ignore: cast_nullable_to_non_nullable
              as RustWorkspaceData?,
      workspaces: freezed == workspaces
          ? _self._workspaces
          : workspaces // ignore: cast_nullable_to_non_nullable
              as List<RustWorkspaceMetadata>?,
      isWorkspaceLoading: freezed == isWorkspaceLoading
          ? _self.isWorkspaceLoading
          : isWorkspaceLoading // ignore: cast_nullable_to_non_nullable
              as bool?,
    ));
  }
}

// dart format on
