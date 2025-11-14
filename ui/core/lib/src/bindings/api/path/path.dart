import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../../bindings.dart';

class RustPath {
  static Future<void> initPath({
    String? dataDir,
    String? cacheDir,
    String? downloadDir,
    String? homeDir,
    String? rootDir,
  }) async {
    homeDir = homeDir ?? (await getApplicationDocumentsDirectory()).path;
    cacheDir = cacheDir ?? (await getTemporaryDirectory()).path;
    downloadDir =
        downloadDir ?? (await getDownloadsDirectory())?.path ?? homeDir;
    dataDir = dataDir ?? (await getApplicationSupportDirectory()).path;
    if (rootDir == null) {
      rootDir = homeDir;
      if (Platform.isAndroid) {
        final directory = await getExternalStorageDirectory();
        if (directory != null) {
          rootDir = directory.path;
        }
      }
    }

    Bindings.invoke(
      key: "path.init_dir",
      value: {
        "dataDir": dataDir,
        "cacheDir": cacheDir,
        "downloadDir": downloadDir,
        "homeDir": homeDir,
        "rootDir": rootDir,
      },
    );
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
    if (kDebugMode) {
      print("RustPath.getCacheDir = ${getCacheDir()}");
      print("RustPath.getHomeDir = ${getHomeDir()}");
      print("RustPath.getDataDir = ${getDataDir()}");
      print("RustPath.getDownloadDir = ${getDownloadDir()}");
    }
  }
}
