// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'settings.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$SettingsStore {
  ThemeSettings get theme => throw _privateConstructorUsedError;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SettingsStoreCopyWith<SettingsStore> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SettingsStoreCopyWith<$Res> {
  factory $SettingsStoreCopyWith(
          SettingsStore value, $Res Function(SettingsStore) then) =
      _$SettingsStoreCopyWithImpl<$Res, SettingsStore>;
  @useResult
  $Res call({ThemeSettings theme});

  $ThemeSettingsCopyWith<$Res> get theme;
}

/// @nodoc
class _$SettingsStoreCopyWithImpl<$Res, $Val extends SettingsStore>
    implements $SettingsStoreCopyWith<$Res> {
  _$SettingsStoreCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? theme = null,
  }) {
    return _then(_value.copyWith(
      theme: null == theme
          ? _value.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
    ) as $Val);
  }

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ThemeSettingsCopyWith<$Res> get theme {
    return $ThemeSettingsCopyWith<$Res>(_value.theme, (value) {
      return _then(_value.copyWith(theme: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$SettingsStoreImplCopyWith<$Res>
    implements $SettingsStoreCopyWith<$Res> {
  factory _$$SettingsStoreImplCopyWith(
          _$SettingsStoreImpl value, $Res Function(_$SettingsStoreImpl) then) =
      __$$SettingsStoreImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({ThemeSettings theme});

  @override
  $ThemeSettingsCopyWith<$Res> get theme;
}

/// @nodoc
class __$$SettingsStoreImplCopyWithImpl<$Res>
    extends _$SettingsStoreCopyWithImpl<$Res, _$SettingsStoreImpl>
    implements _$$SettingsStoreImplCopyWith<$Res> {
  __$$SettingsStoreImplCopyWithImpl(
      _$SettingsStoreImpl _value, $Res Function(_$SettingsStoreImpl) _then)
      : super(_value, _then);

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? theme = null,
  }) {
    return _then(_$SettingsStoreImpl(
      theme: null == theme
          ? _value.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
    ));
  }
}

/// @nodoc

class _$SettingsStoreImpl implements _SettingsStore {
  const _$SettingsStoreImpl({required this.theme});

  @override
  final ThemeSettings theme;

  @override
  String toString() {
    return 'SettingsStore(theme: $theme)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SettingsStoreImpl &&
            (identical(other.theme, theme) || other.theme == theme));
  }

  @override
  int get hashCode => Object.hash(runtimeType, theme);

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SettingsStoreImplCopyWith<_$SettingsStoreImpl> get copyWith =>
      __$$SettingsStoreImplCopyWithImpl<_$SettingsStoreImpl>(this, _$identity);
}

abstract class _SettingsStore implements SettingsStore {
  const factory _SettingsStore({required final ThemeSettings theme}) =
      _$SettingsStoreImpl;

  @override
  ThemeSettings get theme;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SettingsStoreImplCopyWith<_$SettingsStoreImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ThemeSettings {
  Brightness get platformBrightness => throw _privateConstructorUsedError;
  ThemeMode get themeMode => throw _privateConstructorUsedError;
  Color get primaryColor => throw _privateConstructorUsedError;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ThemeSettingsCopyWith<ThemeSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ThemeSettingsCopyWith<$Res> {
  factory $ThemeSettingsCopyWith(
          ThemeSettings value, $Res Function(ThemeSettings) then) =
      _$ThemeSettingsCopyWithImpl<$Res, ThemeSettings>;
  @useResult
  $Res call(
      {Brightness platformBrightness, ThemeMode themeMode, Color primaryColor});
}

/// @nodoc
class _$ThemeSettingsCopyWithImpl<$Res, $Val extends ThemeSettings>
    implements $ThemeSettingsCopyWith<$Res> {
  _$ThemeSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? platformBrightness = null,
    Object? themeMode = null,
    Object? primaryColor = null,
  }) {
    return _then(_value.copyWith(
      platformBrightness: null == platformBrightness
          ? _value.platformBrightness
          : platformBrightness // ignore: cast_nullable_to_non_nullable
              as Brightness,
      themeMode: null == themeMode
          ? _value.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      primaryColor: null == primaryColor
          ? _value.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as Color,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ThemeSettingsImplCopyWith<$Res>
    implements $ThemeSettingsCopyWith<$Res> {
  factory _$$ThemeSettingsImplCopyWith(
          _$ThemeSettingsImpl value, $Res Function(_$ThemeSettingsImpl) then) =
      __$$ThemeSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {Brightness platformBrightness, ThemeMode themeMode, Color primaryColor});
}

/// @nodoc
class __$$ThemeSettingsImplCopyWithImpl<$Res>
    extends _$ThemeSettingsCopyWithImpl<$Res, _$ThemeSettingsImpl>
    implements _$$ThemeSettingsImplCopyWith<$Res> {
  __$$ThemeSettingsImplCopyWithImpl(
      _$ThemeSettingsImpl _value, $Res Function(_$ThemeSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? platformBrightness = null,
    Object? themeMode = null,
    Object? primaryColor = null,
  }) {
    return _then(_$ThemeSettingsImpl(
      platformBrightness: null == platformBrightness
          ? _value.platformBrightness
          : platformBrightness // ignore: cast_nullable_to_non_nullable
              as Brightness,
      themeMode: null == themeMode
          ? _value.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      primaryColor: null == primaryColor
          ? _value.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as Color,
    ));
  }
}

/// @nodoc

class _$ThemeSettingsImpl implements _ThemeSettings {
  const _$ThemeSettingsImpl(
      {required this.platformBrightness,
      required this.themeMode,
      required this.primaryColor});

  @override
  final Brightness platformBrightness;
  @override
  final ThemeMode themeMode;
  @override
  final Color primaryColor;

  @override
  String toString() {
    return 'ThemeSettings(platformBrightness: $platformBrightness, themeMode: $themeMode, primaryColor: $primaryColor)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ThemeSettingsImpl &&
            (identical(other.platformBrightness, platformBrightness) ||
                other.platformBrightness == platformBrightness) &&
            (identical(other.themeMode, themeMode) ||
                other.themeMode == themeMode) &&
            (identical(other.primaryColor, primaryColor) ||
                other.primaryColor == primaryColor));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, platformBrightness, themeMode, primaryColor);

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ThemeSettingsImplCopyWith<_$ThemeSettingsImpl> get copyWith =>
      __$$ThemeSettingsImplCopyWithImpl<_$ThemeSettingsImpl>(this, _$identity);
}

abstract class _ThemeSettings implements ThemeSettings {
  const factory _ThemeSettings(
      {required final Brightness platformBrightness,
      required final ThemeMode themeMode,
      required final Color primaryColor}) = _$ThemeSettingsImpl;

  @override
  Brightness get platformBrightness;
  @override
  ThemeMode get themeMode;
  @override
  Color get primaryColor;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ThemeSettingsImplCopyWith<_$ThemeSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
