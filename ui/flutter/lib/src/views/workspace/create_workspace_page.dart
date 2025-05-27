import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_input.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class CreateWorkspacePage extends ConsumerStatefulWidget {
  final bool isPage;
  const CreateWorkspacePage({super.key, required this.isPage});

  @override
  ConsumerState<CreateWorkspacePage> createState() =>
      _CreateWorkspacePageState();
}

class _CreateWorkspacePageState extends ConsumerState<CreateWorkspacePage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController =
      TextEditingController(text: "新建工作区");

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
  }

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
              if (!widget.isPage) {
                Navigator.of(context).pop();
              }
              final ws = WorkspaceManager.getCurrentWorkspace(ref);
              if (ws != null) {
                AppRouter.jumpToWorkspaceHomePage(context, ws);
              } else {
                Utility.showDialog(
                  context: context,
                  title: "错误",
                  content: "打开工作区失败, 未获取到工作区数据",
                  okText: "确定",
                );
              }
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

  Widget buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          PlatformInput(
            controller: _nameController,
            autofocus: true,
            delayFocus: widget.isPage ? null : 300,
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
            width: double.infinity,
            onPressed: _createWorkspace,
            labelText: '创建并打开',
          ),
        ],
      ),
    );
  }

  Widget buildPage() {
    return PlatformSimplePage(
      title: "创建工作区",
      isLoading: _isLoading,
      child: Column(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: buildForm(),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isPage) {
      return buildPage();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
            padding: EdgeInsets.only(
              bottom: 15.0,
            ),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "创建工作区",
                style: TextStyle(
                  fontSize: 20,
                ),
              ),
            )),
        buildForm()
      ],
    );
  }
}
