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

  final bool? multilineInput;

  final String? customButtonText;
  final void Function(String value, bool Function() validate)?
      onCustomButtonTap;

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
    this.multilineInput,
    this.customButtonText,
    this.onCustomButtonTap,
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

  bool hasCustomBtn() {
    return widget.customButtonText != null || widget.onCustomButtonTap != null;
  }

  void _onFinish() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onFinish?.call(_textController.text);
    }
  }

  void _onCustomBtnTap() {
    widget.onCustomButtonTap?.call(
      _textController.text,
      () => _formKey.currentState?.validate() ?? false,
    );
  }

  Widget buildForm(bool multilineInput) {
    final minLines = multilineInput ? 10 : null;
    final maxLines = multilineInput ? 10 : 1;
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
            minLines: minLines,
            maxLines: maxLines,
          ),
          const SizedBox(height: 12),
          PlatformBtn(
            width: double.infinity,
            onPressed: _onFinish,
            labelText: widget.finishBtnText,
          ),
          if (hasCustomBtn()) const SizedBox(height: 8),
          if (hasCustomBtn())
            PlatformBtn(
              width: double.infinity,
              onPressed: _onCustomBtnTap,
              labelText: widget.customButtonText,
            ),
        ],
      ),
    );
  }

  Widget buildPage(bool multilineInput) {
    return PlatformSimplePage(
      titleText: widget.title,
      child: Column(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: buildForm(multilineInput),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final multilineInput = widget.multilineInput == true;
    if (widget.isPage) {
      return buildPage(multilineInput);
    }
    final multilineHeight = multilineInput ? 300.0 : 0.0;
    final customBtnHeight = hasCustomBtn() ? 80.0 : 0.0;
    return PlatformSheetPage(
      titleText: widget.title,
      desiredHeight:
          widget.desiredHeight ?? (300.0 + multilineHeight + customBtnHeight),
      child: buildForm(multilineInput),
    );
  }
}
