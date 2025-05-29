import 'package:intl/intl.dart';

class TimeUtility {
  static DateTime getTimeFromTimestamp(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
    return date;
  }

  static String formatTimestamp(int timestamp) {
    final formatter = DateFormat('yyyy/MM/dd HH:mm:ss');
    return formatter.format(getTimeFromTimestamp(timestamp));
  }
}
