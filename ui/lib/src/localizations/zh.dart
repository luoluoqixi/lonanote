import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class _ZHMaterialLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const _ZHMaterialLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'zh';

  @override
  Future<MaterialLocalizations> load(Locale locale) =>
      ZHMaterialLocalizations.load(locale);

  @override
  bool shouldReload(_ZHMaterialLocalizationsDelegate old) => false;

  @override
  String toString() => 'CustomMaterialLocalizations.delegate(zh_CN)';
}

class ZHMaterialLocalizations extends DefaultMaterialLocalizations {
  const ZHMaterialLocalizations();

  static Future<MaterialLocalizations> load(Locale locale) {
    return SynchronousFuture<MaterialLocalizations>(
        const ZHMaterialLocalizations());
  }

  static const LocalizationsDelegate<MaterialLocalizations> delegate =
      _ZHMaterialLocalizationsDelegate();

  @override
  String get openAppDrawerTooltip => '打开菜单';

  @override
  String get backButtonTooltip => '返回';

  @override
  String get clearButtonTooltip => '清除文本';

  @override
  String get closeButtonTooltip => '关闭';

  @override
  String get deleteButtonTooltip => '删除';

  @override
  String get moreButtonTooltip => '更多';

  @override
  String get nextMonthTooltip => '下个月';

  @override
  String get previousMonthTooltip => '上个月';

  @override
  String get nextPageTooltip => '下一页';

  @override
  String get previousPageTooltip => '上一页';

  @override
  String get firstPageTooltip => '第一页';

  @override
  String get lastPageTooltip => '最后一页';
}

class _ZHWidgetsLocalizationsDelegate
    extends LocalizationsDelegate<WidgetsLocalizations> {
  const _ZHWidgetsLocalizationsDelegate();

  // This is convenient simplification. It would be more correct test if the locale's
  // text-direction is LTR.
  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<WidgetsLocalizations> load(Locale locale) =>
      ZHWidgetsLocalizations.load(locale);

  @override
  bool shouldReload(_ZHWidgetsLocalizationsDelegate old) => false;

  @override
  String toString() => 'ZHWidgetsLocalizations.delegate(zh_CN)';
}

class ZHWidgetsLocalizations extends DefaultWidgetsLocalizations {
  const ZHWidgetsLocalizations();

  static Future<WidgetsLocalizations> load(Locale locale) {
    return SynchronousFuture<WidgetsLocalizations>(
        const ZHWidgetsLocalizations());
  }

  static const LocalizationsDelegate<WidgetsLocalizations> delegate =
      _ZHWidgetsLocalizationsDelegate();
}

class _ZHCupertinoLocalizationsDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  const _ZHCupertinoLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'zh';

  @override
  Future<CupertinoLocalizations> load(Locale locale) =>
      ZHCupertinoLocalizations.load(locale);

  @override
  bool shouldReload(_ZHCupertinoLocalizationsDelegate old) => false;

  @override
  String toString() => 'ZHCupertinoLocalizations.delegate(zh_CN)';
}

class ZHCupertinoLocalizations extends DefaultCupertinoLocalizations {
  const ZHCupertinoLocalizations();

  static Future<CupertinoLocalizations> load(Locale locale) {
    return SynchronousFuture<CupertinoLocalizations>(
        const ZHCupertinoLocalizations());
  }

  static const LocalizationsDelegate<CupertinoLocalizations> delegate =
      _ZHCupertinoLocalizationsDelegate();
}
