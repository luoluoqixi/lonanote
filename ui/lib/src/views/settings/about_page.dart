import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/config/app_config.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/controller/settings/about_controller.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';

class AboutPage extends ConsumerStatefulWidget {
  const AboutPage({
    super.key,
  });

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _AboutPageState();
}

class _AboutPageState extends ConsumerState<AboutPage> {
  bool _isLatest = false;

  void _checkUpdate(String version) async {
    try {
      final update = await AboutController.checkUpdate(version);
      if (update == null) {
        setState(() {
          _isLatest = true;
        });
      } else {
        if (mounted) {
          DialogTools.showDialog(
            context: context,
            title: "检查到新版本",
            content: "新版本: ${update.latestVersion.tagName}",
            okText: "跳转更新",
            cancelText: "取消",
            onOkPressed: () {
              return null;
            },
          );
        }
      }
    } catch (e) {
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("检查更新失败", e),
          okText: "确定",
        );
      }
    }
  }

  Widget _buildGroup(BuildContext context) {
    final version = RustApp.getVersion() ?? "";
    return PlatformListView(
      insetGrouped: true,
      topMargin: 0,
      children: [
        PlatformListTileRaw(
          title: const Text("当前版本"),
          trailing: Text(version),
          onTap: () {},
        ),
        PlatformListTileRaw(
          title: const Text("检查更新"),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isLatest)
                const Text(
                  "已是最新版本",
                  style: TextStyle(fontSize: 14),
                ),
              if (_isLatest) const SizedBox(width: 8),
              Icon(ThemeIcons.chevronRight(context)),
            ],
          ),
          onTap: () => _checkUpdate(version),
        ),
        PlatformListTileRaw(
          title: const SizedBox(
            width: 200,
            child: Text("Github", softWrap: false),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                AppConfig.githubUrl,
                softWrap: true,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.blue,
                  decoration: TextDecoration.underline,
                ),
              ),
              const SizedBox(width: 8),
              Icon(ThemeIcons.chevronRight(context)),
            ],
          ),
          onTap: () async {
            final url = AppConfig.githubUrl;
            Utility.openUrl(url);
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformSimplePage(
      titleText: '关于',
      child: Column(
        children: [
          const SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Center(
              child: Column(
                children: [
                  Image.asset(
                    'assets/icons/icon_android.png',
                    width: 100,
                    height: 100,
                  ),
                  const SizedBox(
                    height: 10,
                  ),
                  Text(
                    AppConfig.appTitle,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          _buildGroup(context),
        ],
      ),
    );
  }
}
