import { Check, ChevronDown, ChevronUp } from "@tamagui/lucide-icons-2";
import { forwardRef } from "react";
import React from "react";
import {
  Adapt,
  FontSizeTokens,
  Sheet,
  Select as TamaguiSelect,
  YStack,
  getFontSize,
} from "tamagui";
import { LinearGradient } from "tamagui/linear-gradient";

import { isWeb } from "@/api/common/platform";
import { resolveAriaLabel } from "@/components/ui/utils";

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
  return (
    <TamaguiSelect.ItemIndicator {...props}>
      {props.children ?? <Check size={16} />}
    </TamaguiSelect.ItemIndicator>
  );
}

function SelectItemText(props: SelectItemTextProps) {
  return <TamaguiSelect.ItemText {...props} />;
}

function SelectLabel(props: SelectLabelProps) {
  return <TamaguiSelect.Label {...props} />;
}

function SelectScrollDownButton(props: SelectScrollDownButtonProps) {
  return (
    <TamaguiSelect.ScrollDownButton {...props}>
      {props.children ?? <ChevronDown size={16} />}
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={["transparent", "$background"]}
        rounded="$4"
      />
    </TamaguiSelect.ScrollDownButton>
  );
}

function SelectScrollUpButton(props: SelectScrollUpButtonProps) {
  return (
    <TamaguiSelect.ScrollUpButton {...props}>
      {props.children ?? <ChevronUp size={16} />}
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={["$background", "transparent"]}
        rounded="$4"
      />
    </TamaguiSelect.ScrollUpButton>
  );
}

function SelectTrigger(props: SelectTriggerProps) {
  return <TamaguiSelect.Trigger {...props} />;
}

function SelectValue(props: SelectValueProps) {
  return <TamaguiSelect.Value {...props} />;
}

function SelectViewport(props: SelectViewportProps) {
  const {
    children,
    unstyled,
    borderColor,
    borderWidth,
    outlineWidth,
    disableScroll,
    style,
    ...viewportProps
  } = props;
  const shouldUseHeadlessWebViewport = isWeb() && unstyled == null;
  const viewportStyle = isWeb()
    ? [
        {
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          userSelect: "none",
        } as React.CSSProperties,
        style,
      ]
    : style;

  return (
    <TamaguiSelect.Viewport
      {...viewportProps}
      background={viewportProps.background ?? "$background"}
      borderColor={borderColor ?? "$borderColor"}
      borderWidth={borderWidth ?? 1}
      disableScroll={disableScroll}
      outlineWidth={outlineWidth ?? 0}
      size={viewportProps.size ?? "$2"}
      overflowX={isWeb() ? "hidden" : undefined}
      overflowY={disableScroll ? undefined : "auto"}
      style={viewportStyle}
      unstyled={shouldUseHeadlessWebViewport ? true : unstyled}
    >
      {children}
    </TamaguiSelect.Viewport>
  );
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
      "aria-label": ariaLabel,
      children,
      contentProps,
      disabled,
      isDisabled,
      itemIndicatorProps,
      itemProps,
      itemTextProps,
      items,
      itemLabel,
      itemLabelProps,
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
    const getItemLabelByValue = (value: string | null | undefined) =>
      resolvedItems?.find((item) => item.value === value)?.label ?? null;
    const selectedItem = getItemLabelByValue(props.value ?? null);
    const renderedItems = resolvedItems?.map((item, index) => (
      <SelectItem
        {...itemProps}
        aria-label={resolveAriaLabel(item["aria-label"] ?? itemProps?.["aria-label"], item.label)}
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
        <SelectItemIndicator marginLeft="auto" {...itemIndicatorProps} />
      </SelectItem>
    ));

    return (
      <TamaguiSelect
        disablePreventBodyScroll
        {...props}
        onValueChange={(nextValue) => onValueChange?.(nextValue ?? null)}
        renderValue={props.renderValue ?? ((nextValue) => getItemLabelByValue(nextValue))}
      >
        {children ??
          (resolvedItems == null ? null : (
            <>
              <SelectTrigger
                disabled={disabled ?? isDisabled ?? triggerProps?.disabled}
                borderRadius="$4"
                backgroundColor="$background"
                iconAfter={ChevronDown}
                {...triggerProps}
                aria-label={resolveAriaLabel(
                  triggerProps?.["aria-label"] ?? ariaLabel,
                  selectedItem ?? placeholder,
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>

              <Adapt when="md" platform="touch">
                <Sheet native={!!props.native} modal dismissOnSnapToBottom transition="medium">
                  <Sheet.Frame>
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay
                    bg="$shadowColor"
                    transition="lazy"
                    enterStyle={{ opacity: 0 }}
                    exitStyle={{ opacity: 0 }}
                  />
                </Sheet>
              </Adapt>

              <SelectContent {...contentProps}>
                <SelectScrollUpButton
                  items="center"
                  justify="center"
                  position="relative"
                  width="100%"
                  height="$3"
                />
                <SelectViewport
                  bg="$background"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  {...viewportProps}
                >
                  <SelectGroup>
                    {itemLabel && (
                      <Select.Label fontWeight="700" {...itemLabelProps}>
                        {itemLabel}
                      </Select.Label>
                    )}
                    {renderedItems}
                  </SelectGroup>
                  {/* Native gets an extra icon */}
                  {props.native && (
                    <YStack
                      position="absolute"
                      r={0}
                      t={16}
                      items="center"
                      justify="center"
                      width={"$4"}
                      pointerEvents="none"
                    >
                      <ChevronDown size={getFontSize((props.size as FontSizeTokens) ?? "$true")} />
                    </YStack>
                  )}
                </SelectViewport>
                <SelectScrollDownButton
                  items="center"
                  justify="center"
                  position="relative"
                  width="100%"
                  height="$3"
                />
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
