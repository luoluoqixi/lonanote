import 'package:json_annotation/json_annotation.dart';

part 'types.g.dart';

@JsonSerializable()
class RustWorkspaceMetadata {
  RustWorkspaceMetadata({
    required this.name,
    required this.path,
    required this.rootPath,
    required this.lastOpenTime,
  });

  String name;
  String path;
  String rootPath;
  BigInt lastOpenTime;

  factory RustWorkspaceMetadata.fromJson(Map<String, dynamic> json) =>
      _$RustWorkspaceMetadataFromJson(json);

  Map<String, dynamic> toJson() => _$RustWorkspaceMetadataToJson(this);
}

@JsonSerializable()
class RustWorkspaceSettings {
  RustWorkspaceSettings({
    this.fileTreeSortType,
    required this.followGitignore,
    required this.customIgnore,
    required this.uploadImagePath,
    required this.uploadAttachmentPath,
    required this.histroySnapshootCount,
  });

  /// 'name' | 'nameRev' |
  /// 'lastModifiedTime' | 'lastModifiedTimeRev' |
  /// 'createTime' | 'createTimeRev'
  String? fileTreeSortType;
  bool followGitignore;
  String customIgnore;
  String uploadImagePath;
  String uploadAttachmentPath;
  int histroySnapshootCount;

  factory RustWorkspaceSettings.fromJson(Map<String, dynamic> json) =>
      _$RustWorkspaceSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$RustWorkspaceSettingsToJson(this);
}

@JsonSerializable()
class RustWorkspaceSaveData {
  RustWorkspaceSaveData({
    required this.lastOpenFilePath,
  });

  String lastOpenFilePath;

  factory RustWorkspaceSaveData.fromJson(Map<String, dynamic> json) =>
      _$RustWorkspaceSaveDataFromJson(json);

  Map<String, dynamic> toJson() => _$RustWorkspaceSaveDataToJson(this);
}

@JsonSerializable()
class RustWorkspaceData {
  RustWorkspaceData({
    required this.metadata,
    required this.settings,
  });

  RustWorkspaceMetadata metadata;
  RustWorkspaceSettings settings;

  factory RustWorkspaceData.fromJson(Map<String, dynamic> json) =>
      _$RustWorkspaceDataFromJson(json);

  Map<String, dynamic> toJson() => _$RustWorkspaceDataToJson(this);
}

@JsonSerializable()
class RustFileNode {
  RustFileNode({
    this.children,
    required this.fileType,
    required this.path,
    this.size,
    this.lastModifiedTime,
    this.createTime,
    required this.fileCount,
    required this.dirCount,
  });

  RustFileNode? children;

  /// 'file' | 'directory'
  String fileType;
  String path;
  BigInt? size;
  BigInt? lastModifiedTime;
  BigInt? createTime;
  BigInt fileCount;
  BigInt dirCount;

  factory RustFileNode.fromJson(Map<String, dynamic> json) =>
      _$RustFileNodeFromJson(json);

  Map<String, dynamic> toJson() => _$RustFileNodeToJson(this);
}

@JsonSerializable()
class RustFileTree {
  RustFileTree({
    required this.path,
    required this.sortType,
    this.root,
  });

  String path;
  /// 'name' | 'nameRev' |
  /// 'lastModifiedTime' | 'lastModifiedTimeRev' |
  /// 'createTime' | 'createTimeRev'
  String sortType;
  RustFileNode? root;

  factory RustFileTree.fromJson(Map<String, dynamic> json) =>
      _$RustFileTreeFromJson(json);

  Map<String, dynamic> toJson() => _$RustFileTreeToJson(this);
}
