import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/controller/workspace/workspace_controller.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_icons.dart';
import 'package:lonanote/src/widgets/platform_list_view.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';

class WorkspaceSettingsPage extends ConsumerStatefulWidget {
  const WorkspaceSettingsPage({
    super.key,
  });

  @override
  ConsumerState<ConsumerStatefulWidget> createState() =>
      _WorkspaceSettingsPageState();
}

class _WorkspaceSettingsPageState extends ConsumerState<WorkspaceSettingsPage> {
  String? _validatorPath(String? value) {
    return null;
  }

  void _setUploadImagePath(String value) async {
    try {
      await WorkspaceController.setWorkspaceUploadImagePath(ref, value);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _resetUploadImagePath() async {
    try {
      await WorkspaceController.resetWorkspaceUploadImagePath(ref);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _setUploadAttachmentPath(String value) async {
    try {
      await WorkspaceController.setWorkspaceUploadAttachmentPath(ref, value);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _resetUploadAttachmentPath() async {
    try {
      await WorkspaceController.resetWorkspaceUploadAttachmentPath(ref);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _setCustomIgnore(String value) async {
    try {
      await WorkspaceController.setWorkspaceCustomIgnore(ref, value);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _resetCustomIgnore() async {
    try {
      await WorkspaceController.resetWorkspaceCustomIgnore(ref);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  void _setFollowGitIgnore(bool value) async {
    try {
      await WorkspaceController.setWorkspaceFollowGitignore(ref, value);
    } catch (e) {
      logger.e(e);
      if (mounted) {
        DialogTools.showDialog(
          context: context,
          title: "错误",
          content: LoggerUtility.errorShow("更新工作区设置失败", e),
          okText: "确定",
        );
      }
    }
  }

  Widget _buildBasic(BuildContext context, RustWorkspaceData ws) {
    return PlatformListView(
      insetGrouped: true,
      topMargin: 0,
      header: const Text("工作区"),
      children: [
        PlatformListTileRaw(
          title: const Text("名称"),
          trailing: Text(ws.metadata.name),
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildPath(BuildContext context, RustWorkspaceSettings settings) {
    return PlatformListView(
      insetGrouped: true,
      topMargin: 0,
      header: const Text("路径配置"),
      children: [
        PlatformListTileRaw(
          title: Text("上传图片路径"),
          onTap: () {
            AppRouter.showEditSheet(
              context,
              "上传图片路径",
              finishBtnText: "确认修改",
              inputHintText: "上传图片路径",
              initValue: settings.uploadImagePath,
              onFinish: _setUploadImagePath,
              validator: _validatorPath,
              customButtonText: "重置",
              onCustomButtonTap: (_, __) => _resetUploadImagePath(),
              pageName: "/set_workspace_settings_upload_image_path",
            );
          },
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                settings.uploadImagePath,
                style: TextStyle(fontSize: 14),
              ),
              SizedBox(width: 8),
              Icon(ThemeIcons.chevronRight(context)),
            ],
          ),
        ),
        PlatformListTileRaw(
          title: Text("上传附件路径"),
          onTap: () {
            AppRouter.showEditSheet(
              context,
              "上传附件路径",
              finishBtnText: "确认修改",
              inputHintText: "上传附件路径",
              initValue: settings.uploadAttachmentPath,
              onFinish: _setUploadAttachmentPath,
              validator: _validatorPath,
              customButtonText: "重置",
              onCustomButtonTap: (_, __) => _resetUploadAttachmentPath(),
              pageName: "/set_workspace_settings_upload_attachment_path",
            );
          },
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                settings.uploadAttachmentPath,
                style: TextStyle(fontSize: 14),
              ),
              SizedBox(width: 8),
              Icon(ThemeIcons.chevronRight(context)),
            ],
          ),
        ),
        PlatformSwitchListTile(
          title: Text("使用.gitignore规则"),
          value: settings.followGitignore == true,
          onChanged: _setFollowGitIgnore,
        ),
        PlatformListTileRaw(
          title: Text("自定义ignore规则"),
          onTap: () {
            AppRouter.showEditSheet(
              context,
              "自定义ignore规则",
              finishBtnText: "确认修改",
              inputHintText: "自定义ignore规则",
              initValue: settings.customIgnore,
              onFinish: _setCustomIgnore,
              customButtonText: "重置",
              onCustomButtonTap: (_, __) => _resetCustomIgnore(),
              validator: (v) => null,
              multilineInput: true,
              pageName: "/set_workspace_settings_custom_ignore",
            );
          },
          trailing: Icon(ThemeIcons.chevronRight(context)),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final workspace =
        ref.watch(workspaceProvider.select((s) => s.currentWorkspace));
    return PlatformSimplePage(
      titleText: '工作区设置',
      child: workspace == null
          ? Text("加载中...")
          : Column(
              children: [
                _buildBasic(context, workspace),
                _buildPath(context, workspace.settings),
              ],
            ),
    );
  }
}
