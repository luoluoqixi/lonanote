import 'package:url_launcher/url_launcher.dart';

const supportMarkdownExts = [
  'md',
  'markdown',
];

const supportEditorExts = [
  'c',
  'h',
  'cc',
  'cpp',
  'hpp',
  'mm',
  'cs',
  'css',
  'go',
  'html',
  'java',
  'kt',
  'kts',
  'js',
  'ts',
  'jsx',
  'tsx',
  'mjs',
  'cjs',
  'mts',
  'cts',
  'json',
  'less',
  'php',
  'python',
  'rs',
  'sass',
  'scss',
  'sql',
  'vue',
  'xml',
  'plist',
  'storyboard',
  'yaml',
  'yml',
  'md',
  'markdown',
  'txt',
  'bat',
  'development',
  'editorconfig',
  'env',
  'gitattributes',
  'gitignore',
  'gradle',
  'ignore',
  'lock',
  'npmrc',
  'podfile',
  'prettierignore',
  'production',
  'properties',
  'readme',
  'taurignore',
  'toml',
];

const supportImageExts = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'png',
  'gif',
  'webp',
  'svg',
  'apng',
  'bmp',
  'ico',
  'avif',
  'heif',
  'heic',
  'jxl',
  'tga',
];

const supportVideoExts = [
  'mp4',
  'webm',
  'ogg',
  'ogv',
  'avi',
  'mkv',
  'flv',
  'mov',
  'wmv',
];

class Utility {
  static Future<void> openUrl(String url) async {
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  static String? getExtName(String fileName) {
    final index = fileName.lastIndexOf(".");
    if (index < 0) return null;
    return fileName.substring(index + 1).toLowerCase();
  }

  static String getFileName(String path) {
    final index = path.lastIndexOf("/");
    if (index < 0) return path;
    return path.substring(index + 1);
  }

  static bool isSupportEditor(String extName) {
    extName = extName.toLowerCase();
    return isMarkdown(extName) || supportEditorExts.contains(extName);
  }

  static bool isMarkdown(String extName) {
    extName = extName.toLowerCase();
    return supportMarkdownExts.contains(extName);
  }

  static bool isImage(String extName) {
    extName = extName.toLowerCase();
    return supportImageExts.contains(extName);
  }

  static bool isVideo(String extName) {
    extName = extName.toLowerCase();
    return supportVideoExts.contains(extName);
  }
}
