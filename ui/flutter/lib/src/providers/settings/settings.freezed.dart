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
  OtherSettings get otherSettings;
  RustSettingsData? get settings;

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
            (identical(other.theme, theme) || other.theme == theme) &&
            (identical(other.otherSettings, otherSettings) ||
                other.otherSettings == otherSettings) &&
            (identical(other.settings, settings) ||
                other.settings == settings));
  }

  @override
  int get hashCode => Object.hash(runtimeType, theme, otherSettings, settings);

  @override
  String toString() {
    return 'SettingsStore(theme: $theme, otherSettings: $otherSettings, settings: $settings)';
  }
}

/// @nodoc
abstract mixin class $SettingsStoreCopyWith<$Res> {
  factory $SettingsStoreCopyWith(
          SettingsStore value, $Res Function(SettingsStore) _then) =
      _$SettingsStoreCopyWithImpl;
  @useResult
  $Res call(
      {ThemeSettings theme,
      OtherSettings otherSettings,
      RustSettingsData? settings});

  $ThemeSettingsCopyWith<$Res> get theme;
  $OtherSettingsCopyWith<$Res> get otherSettings;
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
    Object? otherSettings = null,
    Object? settings = freezed,
  }) {
    return _then(_self.copyWith(
      theme: null == theme
          ? _self.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
      otherSettings: null == otherSettings
          ? _self.otherSettings
          : otherSettings // ignore: cast_nullable_to_non_nullable
              as OtherSettings,
      settings: freezed == settings
          ? _self.settings
          : settings // ignore: cast_nullable_to_non_nullable
              as RustSettingsData?,
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

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $OtherSettingsCopyWith<$Res> get otherSettings {
    return $OtherSettingsCopyWith<$Res>(_self.otherSettings, (value) {
      return _then(_self.copyWith(otherSettings: value));
    });
  }
}

/// @nodoc

class _SettingsStore implements SettingsStore {
  const _SettingsStore(
      {required this.theme, required this.otherSettings, this.settings});

  @override
  final ThemeSettings theme;
  @override
  final OtherSettings otherSettings;
  @override
  final RustSettingsData? settings;

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
            (identical(other.theme, theme) || other.theme == theme) &&
            (identical(other.otherSettings, otherSettings) ||
                other.otherSettings == otherSettings) &&
            (identical(other.settings, settings) ||
                other.settings == settings));
  }

  @override
  int get hashCode => Object.hash(runtimeType, theme, otherSettings, settings);

  @override
  String toString() {
    return 'SettingsStore(theme: $theme, otherSettings: $otherSettings, settings: $settings)';
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
  $Res call(
      {ThemeSettings theme,
      OtherSettings otherSettings,
      RustSettingsData? settings});

  @override
  $ThemeSettingsCopyWith<$Res> get theme;
  @override
  $OtherSettingsCopyWith<$Res> get otherSettings;
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
    Object? otherSettings = null,
    Object? settings = freezed,
  }) {
    return _then(_SettingsStore(
      theme: null == theme
          ? _self.theme
          : theme // ignore: cast_nullable_to_non_nullable
              as ThemeSettings,
      otherSettings: null == otherSettings
          ? _self.otherSettings
          : otherSettings // ignore: cast_nullable_to_non_nullable
              as OtherSettings,
      settings: freezed == settings
          ? _self.settings
          : settings // ignore: cast_nullable_to_non_nullable
              as RustSettingsData?,
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

  /// Create a copy of SettingsStore
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $OtherSettingsCopyWith<$Res> get otherSettings {
    return $OtherSettingsCopyWith<$Res>(_self.otherSettings, (value) {
      return _then(_self.copyWith(otherSettings: value));
    });
  }
}

/// @nodoc
mixin _$ThemeSettings {
  Brightness get platformBrightness;
  ThemeMode get themeMode;
  Color get primaryColor;
  ThemePrimaryColor get primaryColorEnum;

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
                other.primaryColor == primaryColor) &&
            (identical(other.primaryColorEnum, primaryColorEnum) ||
                other.primaryColorEnum == primaryColorEnum));
  }

  @override
  int get hashCode => Object.hash(runtimeType, platformBrightness, themeMode,
      primaryColor, primaryColorEnum);

  @override
  String toString() {
    return 'ThemeSettings(platformBrightness: $platformBrightness, themeMode: $themeMode, primaryColor: $primaryColor, primaryColorEnum: $primaryColorEnum)';
  }
}

/// @nodoc
abstract mixin class $ThemeSettingsCopyWith<$Res> {
  factory $ThemeSettingsCopyWith(
          ThemeSettings value, $Res Function(ThemeSettings) _then) =
      _$ThemeSettingsCopyWithImpl;
  @useResult
  $Res call(
      {Brightness platformBrightness,
      ThemeMode themeMode,
      Color primaryColor,
      ThemePrimaryColor primaryColorEnum});
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
    Object? primaryColorEnum = null,
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
      primaryColorEnum: null == primaryColorEnum
          ? _self.primaryColorEnum
          : primaryColorEnum // ignore: cast_nullable_to_non_nullable
              as ThemePrimaryColor,
    ));
  }
}

/// @nodoc

class _ThemeSettings implements ThemeSettings {
  const _ThemeSettings(
      {required this.platformBrightness,
      required this.themeMode,
      required this.primaryColor,
      required this.primaryColorEnum});

  @override
  final Brightness platformBrightness;
  @override
  final ThemeMode themeMode;
  @override
  final Color primaryColor;
  @override
  final ThemePrimaryColor primaryColorEnum;

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
                other.primaryColor == primaryColor) &&
            (identical(other.primaryColorEnum, primaryColorEnum) ||
                other.primaryColorEnum == primaryColorEnum));
  }

  @override
  int get hashCode => Object.hash(runtimeType, platformBrightness, themeMode,
      primaryColor, primaryColorEnum);

  @override
  String toString() {
    return 'ThemeSettings(platformBrightness: $platformBrightness, themeMode: $themeMode, primaryColor: $primaryColor, primaryColorEnum: $primaryColorEnum)';
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
      {Brightness platformBrightness,
      ThemeMode themeMode,
      Color primaryColor,
      ThemePrimaryColor primaryColorEnum});
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
    Object? primaryColorEnum = null,
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
      primaryColorEnum: null == primaryColorEnum
          ? _self.primaryColorEnum
          : primaryColorEnum // ignore: cast_nullable_to_non_nullable
              as ThemePrimaryColor,
    ));
  }
}

/// @nodoc
mixin _$OtherSettings {
  bool get showFloatingToolbar;

  /// Create a copy of OtherSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $OtherSettingsCopyWith<OtherSettings> get copyWith =>
      _$OtherSettingsCopyWithImpl<OtherSettings>(
          this as OtherSettings, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is OtherSettings &&
            (identical(other.showFloatingToolbar, showFloatingToolbar) ||
                other.showFloatingToolbar == showFloatingToolbar));
  }

  @override
  int get hashCode => Object.hash(runtimeType, showFloatingToolbar);

  @override
  String toString() {
    return 'OtherSettings(showFloatingToolbar: $showFloatingToolbar)';
  }
}

/// @nodoc
abstract mixin class $OtherSettingsCopyWith<$Res> {
  factory $OtherSettingsCopyWith(
          OtherSettings value, $Res Function(OtherSettings) _then) =
      _$OtherSettingsCopyWithImpl;
  @useResult
  $Res call({bool showFloatingToolbar});
}

/// @nodoc
class _$OtherSettingsCopyWithImpl<$Res>
    implements $OtherSettingsCopyWith<$Res> {
  _$OtherSettingsCopyWithImpl(this._self, this._then);

  final OtherSettings _self;
  final $Res Function(OtherSettings) _then;

  /// Create a copy of OtherSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? showFloatingToolbar = null,
  }) {
    return _then(_self.copyWith(
      showFloatingToolbar: null == showFloatingToolbar
          ? _self.showFloatingToolbar
          : showFloatingToolbar // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _OtherSettings implements OtherSettings {
  const _OtherSettings({required this.showFloatingToolbar});

  @override
  final bool showFloatingToolbar;

  /// Create a copy of OtherSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$OtherSettingsCopyWith<_OtherSettings> get copyWith =>
      __$OtherSettingsCopyWithImpl<_OtherSettings>(this, _$identity);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _OtherSettings &&
            (identical(other.showFloatingToolbar, showFloatingToolbar) ||
                other.showFloatingToolbar == showFloatingToolbar));
  }

  @override
  int get hashCode => Object.hash(runtimeType, showFloatingToolbar);

  @override
  String toString() {
    return 'OtherSettings(showFloatingToolbar: $showFloatingToolbar)';
  }
}

/// @nodoc
abstract mixin class _$OtherSettingsCopyWith<$Res>
    implements $OtherSettingsCopyWith<$Res> {
  factory _$OtherSettingsCopyWith(
          _OtherSettings value, $Res Function(_OtherSettings) _then) =
      __$OtherSettingsCopyWithImpl;
  @override
  @useResult
  $Res call({bool showFloatingToolbar});
}

/// @nodoc
class __$OtherSettingsCopyWithImpl<$Res>
    implements _$OtherSettingsCopyWith<$Res> {
  __$OtherSettingsCopyWithImpl(this._self, this._then);

  final _OtherSettings _self;
  final $Res Function(_OtherSettings) _then;

  /// Create a copy of OtherSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? showFloatingToolbar = null,
  }) {
    return _then(_OtherSettings(
      showFloatingToolbar: null == showFloatingToolbar
          ? _self.showFloatingToolbar
          : showFloatingToolbar // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

// dart format on
