import 'package:intl/intl.dart';

class TimeUtility {
  static DateTime getTimeFromTimestamp(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
    return date;
  }

  static String formatTimestamp(int? timestamp) {
    if (timestamp == null) return "";
    final formatter = DateFormat('yyyy/MM/dd HH:mm:ss');
    return formatter.format(getTimeFromTimestamp(timestamp));
  }

  static int compareTime(int? a, int? b) {
    if (a == null && b != null) {
      return 1;
    }
    if (a != null && b == null) {
      return -1;
    }
    if (a == null && b == null) {
      return 0;
    }
    return a!.compareTo(b!);
  }
}
