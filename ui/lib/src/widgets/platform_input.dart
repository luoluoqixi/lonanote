import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_platform_widgets/flutter_platform_widgets.dart';
import 'package:lonanote/src/common/app_router.dart';
import 'package:lonanote/src/theme/theme_colors.dart';

class PlatformInput extends StatefulWidget {
  final TextEditingController? controller;
  final String? initialValue;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;
  final TextCapitalization? textCapitalization;
  final TextInputAction? textInputAction;
  final TextStyle? style;
  final StrutStyle? strutStyle;
  final TextAlign? textAlign;
  final TextAlignVertical? textAlignVertical;
  final bool? autofocus;
  final bool? readOnly;
  final bool? showCursor;
  final String? obscuringCharacter;
  final bool? obscureText;
  final bool? autocorrect;
  final SmartDashesType? smartDashesType;
  final SmartQuotesType? smartQuotesType;
  final bool? enableSuggestions;
  final int? maxLines;
  final int? minLines;
  final bool? expands;
  final int? maxLength;
  final ValueChanged<String>? onChanged;
  final GestureTapCallback? onTap;
  final VoidCallback? onEditingComplete;
  final ValueChanged<String>? onFieldSubmitted;
  final FormFieldSetter<String>? onSaved;
  final FormFieldValidator<String>? validator;
  final List<TextInputFormatter>? inputFormatters;
  final bool? enabled;
  final double? cursorWidth;
  final double? cursorHeight;
  final Color? cursorColor;
  final Brightness? keyboardAppearance;
  final EdgeInsets? scrollPadding;
  final bool? enableInteractiveSelection;
  final TextSelectionControls? selectionControls;
  final ScrollPhysics? scrollPhysics;
  final Iterable<String>? autofillHints;
  final AutovalidateMode? autovalidateMode;
  final EditableTextContextMenuBuilder? contextMenuBuilder;
  final String? restorationId;
  final SpellCheckConfiguration? spellCheckConfiguration;

  final String? hintText;

  final int? delayFocus;

  final PlatformBuilder<MaterialTextFormFieldData>? material;
  final PlatformBuilder<CupertinoTextFormFieldData>? cupertino;

  const PlatformInput({
    super.key,
    this.controller,
    this.initialValue,
    this.focusNode,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.textInputAction,
    this.style,
    this.strutStyle,
    this.textAlign,
    this.textAlignVertical,
    this.autofocus,
    this.readOnly,
    this.showCursor,
    this.obscuringCharacter,
    this.obscureText,
    this.autocorrect,
    this.smartDashesType,
    this.smartQuotesType,
    this.enableSuggestions,
    this.maxLines = 1,
    this.minLines,
    this.expands,
    this.maxLength,
    this.onChanged,
    this.onTap,
    this.onEditingComplete,
    this.onFieldSubmitted,
    this.onSaved,
    this.validator,
    this.inputFormatters,
    this.enabled,
    this.cursorWidth,
    this.cursorHeight,
    this.cursorColor,
    this.keyboardAppearance,
    this.scrollPadding,
    this.enableInteractiveSelection,
    this.selectionControls,
    this.scrollPhysics,
    this.autofillHints,
    this.autovalidateMode,
    this.contextMenuBuilder,
    this.restorationId,
    this.spellCheckConfiguration,
    this.hintText,
    this.delayFocus,
    this.material,
    this.cupertino,
  });

  @override
  State<StatefulWidget> createState() => _PlatformInputState();
}

class _PlatformInputState extends State<PlatformInput> with RouteAware {
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    autofocusAsync();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    AppRouter.routeObserver.subscribe(this, ModalRoute.of(context)!);
  }

  @override
  void didPush() {
    if (widget.autofocus ?? false) {
      final route = ModalRoute.of(context);
      if (route is PageRoute) {
        route.animation!.addStatusListener((status) {
          if (status == AnimationStatus.completed) {
            // 动画完成时再设置 focus
            focusSync();
          }
        });
      }
    }
  }

  @override
  void dispose() {
    AppRouter.routeObserver.unsubscribe(this);
    _focusNode.dispose();
    super.dispose();
  }

  void autofocusAsync() async {
    if (widget.autofocus != true || widget.delayFocus == null) return;
    await Future.delayed(Duration(milliseconds: widget.delayFocus!));
    focusSync();
  }

  void focusSync() {
    if (widget.focusNode != null) {
      widget.focusNode!.requestFocus();
    } else {
      _focusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ThemeColors.getColorScheme(context);
    return PlatformTextFormField(
      controller: widget.controller,
      initialValue: widget.initialValue,
      focusNode: _focusNode,
      keyboardType: widget.keyboardType,
      textCapitalization: widget.textCapitalization,
      textInputAction: widget.textInputAction,
      style: widget.style ??
          TextStyle(
            color: ThemeColors.getTextColor(colorScheme),
          ),
      strutStyle: widget.strutStyle,
      textAlign: widget.textAlign,
      textAlignVertical: widget.textAlignVertical,
      autofocus: false,
      readOnly: widget.readOnly,
      showCursor: widget.showCursor,
      obscuringCharacter: widget.obscuringCharacter,
      obscureText: widget.obscureText,
      autocorrect: widget.autocorrect,
      smartDashesType: widget.smartDashesType,
      smartQuotesType: widget.smartQuotesType,
      enableSuggestions: widget.enableSuggestions,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      expands: widget.expands,
      maxLength: widget.maxLength,
      onChanged: widget.onChanged,
      onTap: widget.onTap,
      onEditingComplete: widget.onEditingComplete,
      onFieldSubmitted: widget.onFieldSubmitted,
      onSaved: widget.onSaved,
      validator: widget.validator,
      inputFormatters: widget.inputFormatters,
      enabled: widget.enabled,
      cursorWidth: widget.cursorWidth,
      cursorHeight: widget.cursorHeight,
      cursorColor: widget.cursorColor,
      keyboardAppearance: widget.keyboardAppearance,
      scrollPadding: widget.scrollPadding,
      enableInteractiveSelection: widget.enableInteractiveSelection,
      selectionControls: widget.selectionControls,
      scrollPhysics: widget.scrollPhysics,
      autofillHints: widget.autofillHints,
      autovalidateMode: widget.autovalidateMode,
      contextMenuBuilder: widget.contextMenuBuilder,
      restorationId: widget.restorationId,
      spellCheckConfiguration: widget.spellCheckConfiguration,
      hintText: widget.hintText,
      material: widget.material ??
          (_, __) => MaterialTextFormFieldData(
                decoration: InputDecoration(
                  border: OutlineInputBorder(),
                ),
              ),
      cupertino: widget.cupertino ??
          (_, __) => CupertinoTextFormFieldData(
                padding: EdgeInsets.zero,
                decoration: BoxDecoration(
                  border: Border.all(color: CupertinoColors.systemGrey),
                  borderRadius: BorderRadius.circular(8.0),
                ),
              ),
    );
  }
}
