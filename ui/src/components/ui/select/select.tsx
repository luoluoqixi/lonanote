import { ChevronDown } from "@tamagui/lucide-icons-2";
import { forwardRef } from "react";
import { Select as TamaguiSelect } from "tamagui";

import type {
  SelectAdaptContentsProps,
  SelectAdaptProps,
  SelectContentProps,
  SelectFocusScopeProps,
  SelectGroupProps,
  SelectIconProps,
  SelectIndicatorProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectProps,
  SelectScrollDownButtonProps,
  SelectScrollUpButtonProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectViewportProps,
} from "./types";

function SelectAdaptContents(props: SelectAdaptContentsProps) {
  return <TamaguiSelect.Adapt.Contents {...props} />;
}

function SelectAdaptRoot(props: SelectAdaptProps) {
  return <TamaguiSelect.Adapt {...props} />;
}

const SelectAdapt = Object.assign(SelectAdaptRoot, {
  Contents: SelectAdaptContents,
});

function SelectContent(props: SelectContentProps) {
  return <TamaguiSelect.Content {...props} />;
}

function SelectGroup(props: SelectGroupProps) {
  return <TamaguiSelect.Group {...props} />;
}

function SelectIcon(props: SelectIconProps) {
  return <TamaguiSelect.Icon {...props} />;
}

function SelectItem(props: SelectItemProps) {
  return <TamaguiSelect.Item {...props} />;
}

function SelectItemIndicator(props: SelectItemIndicatorProps) {
  return <TamaguiSelect.ItemIndicator {...props} />;
}

function SelectItemText(props: SelectItemTextProps) {
  return <TamaguiSelect.ItemText {...props} />;
}

function SelectLabel(props: SelectLabelProps) {
  return <TamaguiSelect.Label {...props} />;
}

function SelectScrollDownButton(props: SelectScrollDownButtonProps) {
  return <TamaguiSelect.ScrollDownButton {...props} />;
}

function SelectScrollUpButton(props: SelectScrollUpButtonProps) {
  return <TamaguiSelect.ScrollUpButton {...props} />;
}

function SelectTrigger(props: SelectTriggerProps) {
  return <TamaguiSelect.Trigger {...props} />;
}

function SelectValue(props: SelectValueProps) {
  return <TamaguiSelect.Value {...props} />;
}

function SelectViewport(props: SelectViewportProps) {
  return <TamaguiSelect.Viewport {...props} />;
}

function SelectIndicator(props: SelectIndicatorProps) {
  return <TamaguiSelect.Indicator {...props} />;
}

function SelectFocusScope(props: SelectFocusScopeProps) {
  return <TamaguiSelect.FocusScope {...props} />;
}

const SelectRoot = forwardRef<any, SelectProps>(
  (
    {
      accessibilityLabel,
      children,
      contentProps,
      disabled,
      isDisabled,
      itemIndicatorProps,
      itemProps,
      itemTextProps,
      items,
      onValueChange,
      options,
      placeholder,
      triggerProps,
      viewportProps,
      ...props
    },
    ref,
  ) => {
    void ref;
    const resolvedItems = items ?? options;
    const selectedItem = props.value
      ? resolvedItems?.find((item) => item.value === props.value)
      : undefined;

    return (
      <TamaguiSelect
        renderValue={props.renderValue ?? (() => selectedItem?.label ?? null)}
        {...props}
        onValueChange={(nextValue) => onValueChange?.(nextValue ?? null)}
      >
        {children ??
          (resolvedItems == null ? null : (
            <>
              <SelectTrigger
                aria-label={accessibilityLabel}
                disabled={disabled ?? isDisabled ?? triggerProps?.disabled}
                {...triggerProps}
              >
                <SelectValue placeholder={placeholder} />
                <SelectIcon>
                  <ChevronDown size={16} />
                </SelectIcon>
              </SelectTrigger>

              <SelectContent {...contentProps}>
                <SelectViewport {...viewportProps}>
                  {resolvedItems.map((item, index) => (
                    <SelectItem
                      {...itemProps}
                      disabled={item.disabled ?? item.isDisabled ?? itemProps?.disabled}
                      index={index}
                      key={item.value}
                      textValue={item.label}
                      value={item.value}
                    >
                      {item.startContent}
                      <SelectItemText {...itemTextProps}>{item.label}</SelectItemText>
                      {item.description}
                      {item.endContent}
                      <SelectItemIndicator {...itemIndicatorProps} />
                    </SelectItem>
                  ))}
                </SelectViewport>
              </SelectContent>
            </>
          ))}
      </TamaguiSelect>
    );
  },
);

SelectRoot.displayName = "Select";

export const Select = Object.assign(SelectRoot, {
  Adapt: SelectAdapt,
  Content: SelectContent,
  Group: SelectGroup,
  Icon: SelectIcon,
  Item: SelectItem,
  ItemIndicator: SelectItemIndicator,
  ItemText: SelectItemText,
  Label: SelectLabel,
  ScrollDownButton: SelectScrollDownButton,
  ScrollUpButton: SelectScrollUpButton,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Viewport: SelectViewport,
  Indicator: SelectIndicator,
  FocusScope: SelectFocusScope,
});
