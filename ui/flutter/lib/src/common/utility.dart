import 'package:url_launcher/url_launcher.dart';

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

  static bool isImage(String extName) {
    extName = extName.toLowerCase();
    return supportImageExts.contains(extName);
  }

  static bool isVideo(String extName) {
    extName = extName.toLowerCase();
    return supportVideoExts.contains(extName);
  }
}
