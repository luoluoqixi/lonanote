import 'package:json_annotation/json_annotation.dart';

part 'types.g.dart';

@JsonSerializable()
class RustSettingsData {
  RustSettingsData({
    this.autoCheckUpdate,
    this.autoOpenLastWorkspace,
    this.autoSave,
    this.autoSaveInterval,
    this.autoSaveFocusChange,
  });

  bool? autoCheckUpdate;
  bool? autoOpenLastWorkspace;
  bool? autoSave;
  double? autoSaveInterval;
  bool? autoSaveFocusChange;

  factory RustSettingsData.fromJson(Map<String, dynamic> json) =>
      _$RustSettingsDataFromJson(json);

  Map<String, dynamic> toJson() => _$RustSettingsDataToJson(this);
}
