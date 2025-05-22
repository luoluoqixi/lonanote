// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'types.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RustSettingsData _$RustSettingsDataFromJson(Map<String, dynamic> json) =>
    RustSettingsData(
      autoCheckUpdate: json['autoCheckUpdate'] as bool?,
      autoOpenLastWorkspace: json['autoOpenLastWorkspace'] as bool?,
      autoSave: json['autoSave'] as bool?,
      autoSaveInterval: (json['autoSaveInterval'] as num?)?.toDouble(),
      autoSaveFocusChange: json['autoSaveFocusChange'] as bool?,
    );

Map<String, dynamic> _$RustSettingsDataToJson(RustSettingsData instance) =>
    <String, dynamic>{
      'autoCheckUpdate': instance.autoCheckUpdate,
      'autoOpenLastWorkspace': instance.autoOpenLastWorkspace,
      'autoSave': instance.autoSave,
      'autoSaveInterval': instance.autoSaveInterval,
      'autoSaveFocusChange': instance.autoSaveFocusChange,
    };
