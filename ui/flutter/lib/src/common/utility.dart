import 'package:url_launcher/url_launcher.dart';

const supportMarkdownExts = [
  'md',
  'markdown',
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
