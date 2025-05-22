// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'types.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RustWorkspaceMetadata _$RustWorkspaceMetadataFromJson(
        Map<String, dynamic> json) =>
    RustWorkspaceMetadata(
      name: json['name'] as String,
      path: json['path'] as String,
      rootPath: json['rootPath'] as String,
      lastOpenTime: BigInt.parse(json['lastOpenTime'] as String),
    );

Map<String, dynamic> _$RustWorkspaceMetadataToJson(
        RustWorkspaceMetadata instance) =>
    <String, dynamic>{
      'name': instance.name,
      'path': instance.path,
      'rootPath': instance.rootPath,
      'lastOpenTime': instance.lastOpenTime.toString(),
    };

RustWorkspaceSettings _$RustWorkspaceSettingsFromJson(
        Map<String, dynamic> json) =>
    RustWorkspaceSettings(
      fileTreeSortType: json['fileTreeSortType'] as String?,
      followGitignore: json['followGitignore'] as bool,
      customIgnore: json['customIgnore'] as String,
      uploadImagePath: json['uploadImagePath'] as String,
      uploadAttachmentPath: json['uploadAttachmentPath'] as String,
      histroySnapshootCount: (json['histroySnapshootCount'] as num).toInt(),
    );

Map<String, dynamic> _$RustWorkspaceSettingsToJson(
        RustWorkspaceSettings instance) =>
    <String, dynamic>{
      'fileTreeSortType': instance.fileTreeSortType,
      'followGitignore': instance.followGitignore,
      'customIgnore': instance.customIgnore,
      'uploadImagePath': instance.uploadImagePath,
      'uploadAttachmentPath': instance.uploadAttachmentPath,
      'histroySnapshootCount': instance.histroySnapshootCount,
    };

RustWorkspaceSaveData _$RustWorkspaceSaveDataFromJson(
        Map<String, dynamic> json) =>
    RustWorkspaceSaveData(
      lastOpenFilePath: json['lastOpenFilePath'] as String,
    );

Map<String, dynamic> _$RustWorkspaceSaveDataToJson(
        RustWorkspaceSaveData instance) =>
    <String, dynamic>{
      'lastOpenFilePath': instance.lastOpenFilePath,
    };

RustWorkspaceData _$RustWorkspaceDataFromJson(Map<String, dynamic> json) =>
    RustWorkspaceData(
      metadata: RustWorkspaceMetadata.fromJson(
          json['metadata'] as Map<String, dynamic>),
      settings: RustWorkspaceSettings.fromJson(
          json['settings'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$RustWorkspaceDataToJson(RustWorkspaceData instance) =>
    <String, dynamic>{
      'metadata': instance.metadata,
      'settings': instance.settings,
    };

RustFileNode _$RustFileNodeFromJson(Map<String, dynamic> json) => RustFileNode(
      children: json['children'] == null
          ? null
          : RustFileNode.fromJson(json['children'] as Map<String, dynamic>),
      fileType: json['fileType'] as String,
      path: json['path'] as String,
      size: json['size'] == null ? null : BigInt.parse(json['size'] as String),
      lastModifiedTime: json['lastModifiedTime'] == null
          ? null
          : BigInt.parse(json['lastModifiedTime'] as String),
      createTime: json['createTime'] == null
          ? null
          : BigInt.parse(json['createTime'] as String),
      fileCount: BigInt.parse(json['fileCount'] as String),
      dirCount: BigInt.parse(json['dirCount'] as String),
    );

Map<String, dynamic> _$RustFileNodeToJson(RustFileNode instance) =>
    <String, dynamic>{
      'children': instance.children,
      'fileType': instance.fileType,
      'path': instance.path,
      'size': instance.size?.toString(),
      'lastModifiedTime': instance.lastModifiedTime?.toString(),
      'createTime': instance.createTime?.toString(),
      'fileCount': instance.fileCount.toString(),
      'dirCount': instance.dirCount.toString(),
    };

RustFileTree _$RustFileTreeFromJson(Map<String, dynamic> json) => RustFileTree(
      path: json['path'] as String,
      sortType: json['sortType'] as String,
      root: json['root'] == null
          ? null
          : RustFileNode.fromJson(json['root'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$RustFileTreeToJson(RustFileTree instance) =>
    <String, dynamic>{
      'path': instance.path,
      'sortType': instance.sortType,
      'root': instance.root,
    };
