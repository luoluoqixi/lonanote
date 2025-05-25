import 'package:flutter/material.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/bindings/api/workspace/workspace_manager.dart';
import 'package:lonanote/src/common/log.dart';
import 'package:lonanote/src/widgets/platform_button.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class CreateWorkspacePage extends StatefulWidget {
  const CreateWorkspacePage({super.key});

  @override
  State<StatefulWidget> createState() => _CreateWorkspacePageState();
}

class _CreateWorkspacePageState extends State<CreateWorkspacePage> {
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
        await RustWorkspaceManager.createWorkspace(workspaceName);
        logger.i("创建工作区：$workspaceName");
      } catch (e) {
        logger.e(e);
        if (mounted) {
          showPlatformDialog(
            context: context,
            builder: (_) => PlatformAlertDialog(
              title: Text('错误'),
              content: SingleChildScrollView(
                child: Text(LoggerUtility.errorShow("创建工作区失败", e)),
              ),
              actions: <Widget>[
                PlatformDialogAction(
                  child: PlatformText('确定'),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
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
    return Stack(
      children: [
        PlatformPage(
          title: "创建工作区",
          subTitle: "创建一个新的工作区",
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
        ),
        if (_isLoading)
          Container(
            color: Colors.black45,
            child: Center(
              child: PlatformCircularProgressIndicator(),
            ),
          ),
      ],
    );
  }
}
