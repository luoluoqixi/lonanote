import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:path_provider/path_provider.dart';

import '../../bindings.dart';

class Path {
  static Future<void> initPath() async {
    final tempDir = await getTemporaryDirectory();
    final downloadDir = await getDownloadsDirectory();
    final domDir = await getApplicationDocumentsDirectory();
    final dataDir = await getApplicationSupportDirectory();
    Bindings.invoke(key: "path.init_dir", value: {
      "dataDir": dataDir.path,
      "cacheDir": tempDir.path,
      "downloadDir": downloadDir?.path ?? domDir.path,
      "homeDir": domDir.path,
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

    logger.i("Path.getCacheDir = ${getCacheDir()}");
    logger.i("Path.getHomeDir = ${getHomeDir()}");
    logger.i("Path.getDataDir = ${getDataDir()}");
    logger.i("Path.getDownloadDir = ${getDownloadDir()}");
  }
}
