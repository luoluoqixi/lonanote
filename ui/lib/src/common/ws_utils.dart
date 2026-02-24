import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/utility.dart';

class WsUtils {
  static String getFileShowName(String name) {
    final ext = Utility.getExtName(name);
    if (ext != null && Utility.isMarkdown(ext)) {
      return name.substring(0, name.length - (ext.length + 1));
    }
    return name;
  }

  static String getShowName(RustFileNode node) {
    final name = node.path;
    if (node.isFile()) {
      final ext = Utility.getExtName(name);
      if (ext != null && Utility.isMarkdown(ext)) {
        return name.substring(0, name.length - (ext.length + 1));
      }
    }
    return name;
  }

  static String getNameAddMd(String name) {
    if (name.lastIndexOf(".") < 0) {
      name = "$name.md";
    }
    return name;
  }
}
