import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class CreateWorkspacePage extends ConsumerStatefulWidget {
  const CreateWorkspacePage({super.key});

  @override
  ConsumerState<CreateWorkspacePage> createState() =>
      _CreateWorkspacePageState();
}

class _CreateWorkspacePageState extends ConsumerState<CreateWorkspacePage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();

  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _createWorkspace() async {
    if (_formKey.currentState?.validate() ?? false) {
      final workspaceName = _nameController.text.trim();

      setState(() {
        _isLoading = true;
      });

      try {
        final path = await WorkspaceManager.createWorkspace(ref, workspaceName);
        if (mounted) {
          try {
            await WorkspaceManager.openWorkspace(ref, path);
            if (mounted) {
              AppRouter.jumpToWorkspaceHomePage(context);
            }
          } catch (e) {
            if (mounted) {
              Utility.showDialog(
                context: context,
                title: "错误",
                content: LoggerUtility.errorShow("打开工作区失败", e),
                okText: "确定",
              );
            }
          }
        }
      } catch (e) {
        logger.e(e);
        if (mounted) {
          Utility.showDialog(
            context: context,
            title: "错误",
            content: LoggerUtility.errorShow("创建工作区失败", e),
            okText: "确定",
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PlatformPage(
      title: "创建工作区",
      subTitle: "创建一个新的工作区",
      isLoading: _isLoading,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                PlatformTextFormField(
                  controller: _nameController,
                  autofocus: true,
                  hintText: '工作区名称',
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '请输入工作区名称';
                    }
                    final invalidChars = RegExp(r'[\/\\:\*\?"<>\|]');
                    if (invalidChars.hasMatch(value)) {
                      return '工作区名称中不能包含特殊字符: / \\ : * ? " < > | ';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                PlatformButton(
                  onPressed: _createWorkspace,
                  labelText: '创建并打开',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
