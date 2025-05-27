import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/platform_pull_down_button.dart';
import 'package:pull_down_button/pull_down_button.dart';

class WorkspaceHomePage extends ConsumerStatefulWidget {
  final RustWorkspaceData workspace;
  const WorkspaceHomePage({super.key, required this.workspace});

  @override
  ConsumerState<WorkspaceHomePage> createState() => _WorkspaceHomePageState();
}

class _WorkspaceHomePageState extends ConsumerState<WorkspaceHomePage> {
  @override
  void dispose() {
    super.dispose();
  }

  void selectWorkspace() {
    AppRouter.jumpToSelectWorkspacePage(context);
  }

  void openSettings() {
    AppRouter.jumpToSettingsPage(context);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final wsName = widget.workspace.metadata.name;
    return PlatformPage(
      title: wsName,
      titleActions: [
        PlatformPullDownButton(
          itemBuilder: (context) => [
            PullDownMenuItem(
              title: "切换工作区",
              onTap: selectWorkspace,
            ),
            PullDownMenuItem(
              title: "设置",
              onTap: openSettings,
            ),
          ],
          buttonIcon: Icon(
            ThemeIcons.more(context),
            color: ThemeColors.getTextGreyColor(colorScheme),
            size: 28,
          ),
        ),
      ],
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Text(wsName),
        ),
      ),
    );
  }
}
