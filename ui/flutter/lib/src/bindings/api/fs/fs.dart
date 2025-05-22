import 'package:lonanote/src/bindings/api/path/path.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';

import '../../bindings.dart';

class Fs {
  static bool exists(String path) {
    return Bindings.invoke(key: "fs.exists", value: {"path": path});
  }

  static bool isDir(String path) {
    return Bindings.invoke(key: "fs.is_dir", value: {"path": path});
  }

  static bool isFile(String path) {
    return Bindings.invoke(key: "fs.is_file", value: {"path": path});
  }

  static String readToString(String path) {
    return Bindings.invoke(key: "fs.read_to_string", value: {"path": path});
  }

  static List<int> readBinary(String path) {
    final res = Bindings.invoke(key: "fs.read_binary", value: {"path": path});
    final list = res as List<dynamic>;
    return list.cast<int>();
  }

  static void createDir(String path) {
    Bindings.invoke(key: "fs.create_dir", value: {"path": path});
  }

  static void createDirAll(String path) {
    Bindings.invoke(key: "fs.create_dir_all", value: {"path": path});
  }

  static void createFile(String path, String content) {
    Bindings.invoke(
        key: "fs.create_file", value: {"path": path, "content": content});
  }

  static void delete(String path, bool trash) {
    Bindings.invoke(key: "fs.delete", value: {"path": path, "trash": trash});
  }

  static void move(String srcPath, String targetPath, bool override) {
    Bindings.invoke(key: "fs.move", value: {
      "srcPath": srcPath,
      "targetPath": targetPath,
      "override": override
    });
  }

  static void copy(String srcPath, String targetPath, bool override) {
    Bindings.invoke(key: "fs.copy", value: {
      "srcPath": srcPath,
      "targetPath": targetPath,
      "override": override
    });
  }

  static void write(String path, String contents) {
    Bindings.invoke(
        key: "fs.write", value: {"path": path, "contents": contents});
  }

  static Future<void> saveImageUrlToFile(String imageUrl, String filePath) async {
    await Bindings.invokeAsync(
        key: "fs.save_image_url_to_file",
        value: {"imageUrl": imageUrl, "filePath": filePath});
  }

  static void test() async {
    if (!AppConfig.isDebug) return;

    final testFilePath = "${Path.getCacheDir()}/test.txt";
    write(testFilePath, "test123");
    final fileText = readToString(testFilePath);
    final binary = readBinary(testFilePath);
    logger.i("Fs.exists = ${exists(testFilePath)}");
    logger.i("Fs.readToString = $fileText");
    logger.i("Fs.readBinary = ${binary.length}");
    logger.i("Fs.isFile = ${isFile(testFilePath)}");

    final testDirPath = "${Path.getCacheDir()}/testDir";
    createDirAll(testDirPath);
    logger.i("Fs.createDirAll = ${exists(testDirPath)}");
    logger.i("Fs.isDir = ${isDir(testDirPath)}");
    delete(testDirPath, false);

    final copyFilePath = "${Path.getCacheDir()}/copyText.txt";
    copy(testFilePath, copyFilePath, true);
    logger.i("Fs.copy = ${exists(copyFilePath)}");

    final moveFilePath = "${Path.getCacheDir()}/moveText.txt";
    copy(testFilePath, moveFilePath, true);
    logger.i("Fs.move = ${exists(moveFilePath)}");

    final imgPath = "${Path.getCacheDir()}/img.png";
    await saveImageUrlToFile("https://raw.githubusercontent.com/lona-labs/lonanote/refs/heads/main/resources/icons/icon.png", imgPath);
    logger.i("Fs.saveImageUrlToFile = ${exists(imgPath)}");

    delete(testFilePath, false);
    delete(copyFilePath, false);
    delete(moveFilePath, false);
    delete(imgPath, false);
    logger.i("Fs.delete = success");
  }
}
