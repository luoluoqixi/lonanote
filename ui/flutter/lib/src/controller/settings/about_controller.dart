import 'dart:convert';
import 'package:http/http.dart' as http;

class LatestVersionAsset {
  final String? browserDownloadUrl;
  final String? contentType;
  final String? createdAt;
  final int? downloadCount;
  final int? id;
  final String? label;
  final String? name;
  final String? nodeId;
  final int? size;
  final String? state;
  final String? updatedAt;
  final dynamic uploader;
  final String? url;

  LatestVersionAsset({
    this.browserDownloadUrl,
    this.contentType,
    this.createdAt,
    this.downloadCount,
    this.id,
    this.label,
    this.name,
    this.nodeId,
    this.size,
    this.state,
    this.updatedAt,
    this.uploader,
    this.url,
  });

  factory LatestVersionAsset.fromJson(Map<String, dynamic> json) {
    return LatestVersionAsset(
      browserDownloadUrl: json['browser_download_url'],
      contentType: json['content_type'],
      createdAt: json['created_at'],
      downloadCount: json['download_count'],
      id: json['id'],
      label: json['label'],
      name: json['name'],
      nodeId: json['node_id'],
      size: json['size'],
      state: json['state'],
      updatedAt: json['updated_at'],
      uploader: json['uploader'],
      url: json['url'],
    );
  }
}

class LatestVersion {
  final List<LatestVersionAsset>? assets;
  final String? assetsUrl;
  final dynamic author;
  final String? body;
  final String? createdAt;
  final bool? draft;
  final String? htmlUrl;
  final int? id;
  final String? name;
  final String? nodeId;
  final bool? prerelease;
  final String? publishedAt;
  final String? tagName;
  final String? tarballUrl;
  final String? targetCommitish;
  final String? uploadUrl;
  final String? url;
  final String? zipballUrl;

  LatestVersion({
    this.assets,
    this.assetsUrl,
    this.author,
    this.body,
    this.createdAt,
    this.draft,
    this.htmlUrl,
    this.id,
    this.name,
    this.nodeId,
    this.prerelease,
    this.publishedAt,
    this.tagName,
    this.tarballUrl,
    this.targetCommitish,
    this.uploadUrl,
    this.url,
    this.zipballUrl,
  });

  factory LatestVersion.fromJson(Map<String, dynamic> json) {
    return LatestVersion(
      assets: (json['assets'] as List<dynamic>?)
          ?.map((e) => LatestVersionAsset.fromJson(e as Map<String, dynamic>))
          .toList(),
      assetsUrl: json['assets_url'],
      author: json['author'],
      body: json['body'],
      createdAt: json['created_at'],
      draft: json['draft'],
      htmlUrl: json['html_url'],
      id: json['id'],
      name: json['name'],
      nodeId: json['node_id'],
      prerelease: json['prerelease'],
      publishedAt: json['published_at'],
      tagName: json['tag_name'],
      tarballUrl: json['tarball_url'],
      targetCommitish: json['target_commitish'],
      uploadUrl: json['upload_url'],
      url: json['url'],
      zipballUrl: json['zipball_url'],
    );
  }
}

class UpdateData {
  final String downloadUrl;
  final LatestVersion latestVersion;

  UpdateData({
    required this.downloadUrl,
    required this.latestVersion,
  });
}

class AboutController {
  static Future<UpdateData?> checkUpdate(String currentVersion) async {
    const String getLatestUrl =
        'https://api.github.com/repos/lona-labs/lonanote/releases/latest';

    final response = await http.get(Uri.parse(getLatestUrl));

    if (response.statusCode == 200) {
      final jsonData = json.decode(response.body) as Map<String, dynamic>;
      final latest = LatestVersion.fromJson(jsonData);

      final tagName = latest.tagName;
      final currentTag = 'v$currentVersion';

      if (tagName == currentTag) {
        return null; // 已是最新版本
      }

      return UpdateData(
        downloadUrl: 'https://github.com/lona-labs/lonanote/releases/latest',
        latestVersion: latest,
      );
    } else {
      throw Exception(
          'fetch latest version error: ${response.statusCode}, $getLatestUrl');
    }
  }
}
