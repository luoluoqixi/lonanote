import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote/src/widgets/platform_btn.dart';
import 'package:lonanote/src/widgets/platform_input.dart';
import 'package:lonanote/src/widgets/platform_page.dart';

class EditSheet extends ConsumerStatefulWidget {
  final bool isPage;
  final String title;

  final double? desiredHeight;
  final String? initValue;
  final String? finishBtnText;
  final String? inputHintText;
  final bool? autofocus;

  final void Function(String value)? onFinish;
  final String? Function(String?)? validator;

  const EditSheet({
    super.key,
    this.desiredHeight,
    required this.isPage,
    required this.title,
    this.initValue,
    this.finishBtnText,
    this.inputHintText,
    this.autofocus,
    this.onFinish,
    this.validator,
  });

  @override
  ConsumerState<EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends ConsumerState<EditSheet> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _textController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initValue != null) _textController.text = widget.initValue!;
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _onFinish() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onFinish?.call(_textController.text);
    }
  }

  Widget buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          PlatformInput(
            controller: _textController,
            autofocus: widget.autofocus ?? true,
            delayFocus: widget.isPage ? null : 300,
            hintText: widget.inputHintText,
            validator: widget.validator,
          ),
          const SizedBox(height: 12),
          PlatformBtn(
            width: double.infinity,
            onPressed: _onFinish,
            labelText: widget.finishBtnText,
          ),
        ],
      ),
    );
  }

  Widget buildPage() {
    return PlatformSimplePage(
      titleText: widget.title,
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
    return PlatformSheetPage(
      titleText: widget.title,
      desiredHeight: widget.desiredHeight ?? 300,
      child: buildForm(),
    );
  }
}
