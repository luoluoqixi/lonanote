// dart format width=80
// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'settings.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SettingsStore {
  ThemeSettings get theme;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $SettingsStoreCopyWith<SettingsStore> get copyWith =>
      _$SettingsStoreCopyWithImpl<SettingsStore>(
          this as SettingsStore, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is SettingsStore &&
            (identical(other.theme, theme) || other.theme == theme));
  }

  @override
  int get hashCode => Object.hash(runtimeType, theme);

  @override
  String toString() {
    return 'SettingsStore(theme: $theme)';
  }
}

/// @nodoc
abstract mixin class $SettingsStoreCopyWith<$Res> {
  factory $SettingsStoreCopyWith(
          SettingsStore value, $Res Function(SettingsStore) _then) =
      _$SettingsStoreCopyWithImpl;
  @useResult
  $Res call({ThemeSettings theme});

  $ThemeSettingsCopyWith<$Res> get theme;
}

/// @nodoc
class _$SettingsStoreCopyWithImpl<$Res>
    implements $SettingsStoreCopyWith<$Res> {
  _$SettingsStoreCopyWithImpl(this._self, this._then);

  final SettingsStore _self;
  final $Res Function(SettingsStore) _then;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? theme = null,
  }) {
    return _then(_self.copyWith(
      theme: null == theme
          ? _self.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
    ));
  }

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ThemeSettingsCopyWith<$Res> get theme {
    return $ThemeSettingsCopyWith<$Res>(_self.theme, (value) {
      return _then(_self.copyWith(theme: value));
    });
  }
}

/// @nodoc

class _SettingsStore implements SettingsStore {
  const _SettingsStore({required this.theme});

  @override
  final ThemeSettings theme;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$SettingsStoreCopyWith<_SettingsStore> get copyWith =>
      __$SettingsStoreCopyWithImpl<_SettingsStore>(this, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _SettingsStore &&
            (identical(other.theme, theme) || other.theme == theme));
  }

  @override
  int get hashCode => Object.hash(runtimeType, theme);

  @override
  String toString() {
    return 'SettingsStore(theme: $theme)';
  }
}

/// @nodoc
abstract mixin class _$SettingsStoreCopyWith<$Res>
    implements $SettingsStoreCopyWith<$Res> {
  factory _$SettingsStoreCopyWith(
          _SettingsStore value, $Res Function(_SettingsStore) _then) =
      __$SettingsStoreCopyWithImpl;
  @override
  @useResult
  $Res call({ThemeSettings theme});

  @override
  $ThemeSettingsCopyWith<$Res> get theme;
}

/// @nodoc
class __$SettingsStoreCopyWithImpl<$Res>
    implements _$SettingsStoreCopyWith<$Res> {
  __$SettingsStoreCopyWithImpl(this._self, this._then);

  final _SettingsStore _self;
  final $Res Function(_SettingsStore) _then;

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? theme = null,
  }) {
    return _then(_SettingsStore(
      theme: null == theme
          ? _self.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
    ));
  }

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ThemeSettingsCopyWith<$Res> get theme {
    return $ThemeSettingsCopyWith<$Res>(_self.theme, (value) {
      return _then(_self.copyWith(theme: value));
    });
  }
}

/// @nodoc
mixin _$ThemeSettings {
  Brightness get platformBrightness;
  ThemeMode get themeMode;
  Color get primaryColor;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $ThemeSettingsCopyWith<ThemeSettings> get copyWith =>
      _$ThemeSettingsCopyWithImpl<ThemeSettings>(
          this as ThemeSettings, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is ThemeSettings &&
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

  @override
  String toString() {
    return 'ThemeSettings(platformBrightness: $platformBrightness, themeMode: $themeMode, primaryColor: $primaryColor)';
  }
}

/// @nodoc
abstract mixin class $ThemeSettingsCopyWith<$Res> {
  factory $ThemeSettingsCopyWith(
          ThemeSettings value, $Res Function(ThemeSettings) _then) =
      _$ThemeSettingsCopyWithImpl;
  @useResult
  $Res call(
      {Brightness platformBrightness, ThemeMode themeMode, Color primaryColor});
}

/// @nodoc
class _$ThemeSettingsCopyWithImpl<$Res>
    implements $ThemeSettingsCopyWith<$Res> {
  _$ThemeSettingsCopyWithImpl(this._self, this._then);

  final ThemeSettings _self;
  final $Res Function(ThemeSettings) _then;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? platformBrightness = null,
    Object? themeMode = null,
    Object? primaryColor = null,
  }) {
    return _then(_self.copyWith(
      platformBrightness: null == platformBrightness
          ? _self.platformBrightness
          : platformBrightness // ignore: cast_nullable_to_non_nullable
              as Brightness,
      themeMode: null == themeMode
          ? _self.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      primaryColor: null == primaryColor
          ? _self.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as Color,
    ));
  }
}

/// @nodoc

class _ThemeSettings implements ThemeSettings {
  const _ThemeSettings(
      {required this.platformBrightness,
      required this.themeMode,
      required this.primaryColor});

  @override
  final Brightness platformBrightness;
  @override
  final ThemeMode themeMode;
  @override
  final Color primaryColor;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$ThemeSettingsCopyWith<_ThemeSettings> get copyWith =>
      __$ThemeSettingsCopyWithImpl<_ThemeSettings>(this, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _ThemeSettings &&
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

  @override
  String toString() {
    return 'ThemeSettings(platformBrightness: $platformBrightness, themeMode: $themeMode, primaryColor: $primaryColor)';
  }
}

/// @nodoc
abstract mixin class _$ThemeSettingsCopyWith<$Res>
    implements $ThemeSettingsCopyWith<$Res> {
  factory _$ThemeSettingsCopyWith(
          _ThemeSettings value, $Res Function(_ThemeSettings) _then) =
      __$ThemeSettingsCopyWithImpl;
  @override
  @useResult
  $Res call(
      {Brightness platformBrightness, ThemeMode themeMode, Color primaryColor});
}

/// @nodoc
class __$ThemeSettingsCopyWithImpl<$Res>
    implements _$ThemeSettingsCopyWith<$Res> {
  __$ThemeSettingsCopyWithImpl(this._self, this._then);

  final _ThemeSettings _self;
  final $Res Function(_ThemeSettings) _then;

  /// Create a copy of ThemeSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? platformBrightness = null,
    Object? themeMode = null,
    Object? primaryColor = null,
  }) {
    return _then(_ThemeSettings(
      platformBrightness: null == platformBrightness
          ? _self.platformBrightness
          : platformBrightness // ignore: cast_nullable_to_non_nullable
              as Brightness,
      themeMode: null == themeMode
          ? _self.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      primaryColor: null == primaryColor
          ? _self.primaryColor
          : primaryColor // ignore: cast_nullable_to_non_nullable
              as Color,
    ));
  }
}

// dart format on
