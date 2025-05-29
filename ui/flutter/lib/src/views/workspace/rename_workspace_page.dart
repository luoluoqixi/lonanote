import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/bindings/api/workspace/types.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/controller/workspace/workspace_manager.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_input.dart';
import 'package:lonanote/src/widgets/platform_page.dart';
import 'package:lonanote/src/widgets/tools/dialog_tools.dart';

class RenameWorkspacePage extends ConsumerStatefulWidget {
  final RustWorkspaceMetadata workspace;
  const RenameWorkspacePage({super.key, required this.workspace});

  @override
  ConsumerState<RenameWorkspacePage> createState() =>
      _RenameWorkspacePageState();
}

class _RenameWorkspacePageState extends ConsumerState<RenameWorkspacePage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.workspace.name);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _renameWorkspace() async {
    if (_formKey.currentState?.validate() ?? false) {
      final workspaceName = _nameController.text.trim();

      // setState(() {
      //   _isLoading = true;
      // });

      try {
        await WorkspaceManager.renameWorkspace(
            ref, widget.workspace.path, workspaceName);
        if (mounted) {
          Navigator.of(context).pop();
        }
      } catch (e) {
        logger.e(e);
        if (mounted) {
          DialogTools.showDialog(
            context: context,
            title: "错误",
            content: LoggerUtility.errorShow("重命名工作区失败", e),
            okText: "确定",
          );
        }
      } finally {
        // if (mounted) {
        //   setState(() {
        //     _isLoading = false;
        //   });
        // }
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
            delayFocus: 300,
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
            onPressed: _renameWorkspace,
            labelText: '确认修改',
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PlatformSheetPage(
      titleText: "重命名工作区",
      childSize: 0.35,
      child: buildForm(),
    );
  }
}
