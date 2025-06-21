import 'dart:io';

import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:path_provider/path_provider.dart';

import '../../bindings.dart';

class RustPath {
  static Future<void> initPath() async {
    final tempDir = await getTemporaryDirectory();
    final downloadDir = await getDownloadsDirectory();
    var documentDir = await getApplicationDocumentsDirectory();
    final dataDir = await getApplicationSupportDirectory();
    if (Platform.isAndroid) {
      final directory = await getExternalStorageDirectory();
      if (directory != null) {
        documentDir = directory;
      }
    }
    Bindings.invoke(key: "path.init_dir", value: {
      "dataDir": dataDir.path,
      "cacheDir": tempDir.path,
      "downloadDir": downloadDir?.path ?? documentDir.path,
      "homeDir": documentDir.path,
      "rootDir": documentDir.path,
    });
  }

  static String getCacheDir() {
    return Bindings.invoke(key: "path.get_cache_dir");
  }

  static String getHomeDir() {
    return Bindings.invoke(key: "path.get_home_dir");
  }

  static String getDataDir() {
    return Bindings.invoke(key: "path.get_data_dir");
  }

  static String getDownloadDir() {
    return Bindings.invoke(key: "path.get_download_dir");
  }

  static void test() {
    if (!AppConfig.isDebug) return;

    logger.i("RustPath.getCacheDir = ${getCacheDir()}");
    logger.i("RustPath.getHomeDir = ${getHomeDir()}");
    logger.i("RustPath.getDataDir = ${getDataDir()}");
    logger.i("RustPath.getDownloadDir = ${getDownloadDir()}");
  }
}
