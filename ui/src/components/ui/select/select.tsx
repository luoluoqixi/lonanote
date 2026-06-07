import { Picker as RNPPicker } from "@react-native-picker/picker";
import {
  AdaptContext,
  AdaptPortalContents,
  useAdaptContext,
  useAdaptIsActive,
} from "@tamagui/adapt";
import { Theme, isWeb as isTamaguiWeb, useTheme, useThemeName } from "@tamagui/core";
import { Dismissable } from "@tamagui/dismissable";
import { FocusScope } from "@tamagui/focus-scope";
import { Check, ChevronDown, ChevronUp } from "@tamagui/lucide-icons-2";
import { Portal } from "@tamagui/portal";
import { RemoveScroll } from "@tamagui/remove-scroll";
import {
  ForwardSelectContext,
  SelectZIndexContext,
  useSelectContext,
  useSelectItemParentContext,
} from "@tamagui/select";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import React from "react";
import { View } from "react-native";
import { FontSizeTokens, Select as TamaguiSelect, Text, YStack, getFontSize } from "tamagui";
import { LinearGradient } from "tamagui/linear-gradient";

import { isWeb, os } from "@/api/common/platform";
import { Menu } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import {
  resolveAriaLabel,
  triggerNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

import {
  type ResolvedSelectItemData,
  type ResolvedSelectItemGroupData,
  resolveSelectItemGroups,
} from "./select_grouping";
import type {
  NativePickerMode,
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

const DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT = 6;
const DEFAULT_TOUCH_SHEET_ITEM_HEIGHT = 48;
const DEFAULT_TOUCH_SHEET_CHROME_HEIGHT = 88;
const DEFAULT_TOUCH_SHEET_LABEL_HEIGHT = 32;
const DEFAULT_TOUCH_SHEET_GROUP_GAP = 12;
const DEFAULT_TOUCH_ITEM_CONTENT_STYLE = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
} as const;
const DEFAULT_SELECT_ITEM_CONTENT_STYLE = {
  ...DEFAULT_TOUCH_ITEM_CONTENT_STYLE,
  paddingHorizontal: 16,
} as const;
const TOUCH_SELECT_ITEM_CONTENT_STYLE = {
  ...DEFAULT_TOUCH_ITEM_CONTENT_STYLE,
  minHeight: DEFAULT_TOUCH_SHEET_ITEM_HEIGHT,
  paddingHorizontal: 24,
} as const;
const TOUCH_SHEET_SCROLL_CONTENT_STYLE = {
  paddingBottom: 28,
  paddingHorizontal: 16,
  paddingTop: 10,
  width: "100%",
} as const;
const TOUCH_SHEET_GROUP_RADIUS = 24;
const TOUCH_SHEET_FRAME_BACKGROUND = "$backgroundPress" as const;
const TOUCH_SHEET_GROUP_BACKGROUND = "$background" as const;
const TOUCH_SHEET_SEPARATOR_COLOR = "$borderColor" as const;

const DEFAULT_ANDROID_NATIVE_PICKER_MODE: NativePickerMode = "dialog";
const DEFAULT_IOS_NATIVE_PICKER_MODE: NativePickerMode = "menu";

const SelectAdaptHiddenContext = React.createContext(true);

type TouchSheetConfig = {
  frameMaxHeight?: SelectProps["touchSheetMaxHeight"];
  shouldEnableScroll: boolean;
  snapPoints: [number];
  snapPointsMode: "constant" | "percent";
};

function parsePercentSnapPoint(value: SelectProps["touchSheetMaxHeight"]) {
  if (typeof value !== "string") {
    return null;
  }

  const matched = value.trim().match(/^(\d+(?:\.\d+)?)%$/);

  if (matched == null) {
    return null;
  }

  const parsedValue = Number.parseFloat(matched[1]);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.max(0, Math.min(100, parsedValue));
}

function resolveTouchSheetConfig({
  groupCount,
  groupLabelCount,
  itemCount,
  touchSheetMaxHeight,
}: {
  groupCount: number;
  groupLabelCount: number;
  itemCount: number;
  touchSheetMaxHeight: SelectProps["touchSheetMaxHeight"];
}): TouchSheetConfig {
  const totalItemCount = Math.max(itemCount, 1);
  const visibleItemCount = Math.min(totalItemCount, DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT);
  const visibleGroupGapCount = Math.max(Math.min(groupCount, visibleItemCount) - 1, 0);
  const estimatedVisibleHeight =
    visibleItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    DEFAULT_TOUCH_SHEET_CHROME_HEIGHT +
    visibleGroupGapCount * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT;
  const estimatedContentHeight =
    totalItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    DEFAULT_TOUCH_SHEET_CHROME_HEIGHT +
    Math.max(groupCount - 1, 0) * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT;

  if (typeof touchSheetMaxHeight === "number" && Number.isFinite(touchSheetMaxHeight)) {
    const snapPoint = Math.max(1, Math.round(touchSheetMaxHeight));

    return {
      shouldEnableScroll: estimatedContentHeight > snapPoint,
      snapPoints: [snapPoint],
      snapPointsMode: "constant",
    };
  }

  const percentSnapPoint = parsePercentSnapPoint(touchSheetMaxHeight);

  if (percentSnapPoint != null) {
    return {
      shouldEnableScroll: estimatedContentHeight > estimatedVisibleHeight,
      snapPoints: [percentSnapPoint],
      snapPointsMode: "percent",
    };
  }

  return {
    ...(touchSheetMaxHeight != null ? { frameMaxHeight: touchSheetMaxHeight } : null),
    shouldEnableScroll: estimatedContentHeight > estimatedVisibleHeight,
    snapPoints: [estimatedVisibleHeight],
    snapPointsMode: "constant",
  };
}

function SelectAdaptContents(props: SelectAdaptContentsProps) {
  return <TamaguiSelect.Adapt.Contents {...props} />;
}

function SelectAdaptRoot(props: SelectAdaptProps) {
  return <TamaguiSelect.Adapt {...props} />;
}

const SelectAdapt = Object.assign(SelectAdaptRoot, {
  Contents: SelectAdaptContents,
});

function SelectSheetController(props: { children: React.ReactNode }) {
  const context = useSelectContext();
  const itemParentContext = useSelectItemParentContext();
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const [isAdaptFullyHidden, setIsAdaptFullyHidden] = React.useState(!context.open);

  React.useEffect(() => {
    if (context.open) {
      setIsAdaptFullyHidden(false);
    }
  }, [context.open]);

  const handleSheetAnimationComplete = React.useCallback(({ open }: { open: boolean }) => {
    if (!open) {
      setIsAdaptFullyHidden(true);
    }
  }, []);

  return (
    <Sheet.Controller
      hidden={!isAdapted}
      onAnimationComplete={handleSheetAnimationComplete}
      onOpenChange={(nextOpen: boolean) => {
        if (isAdapted) {
          itemParentContext.setOpen(nextOpen);
        }
      }}
      open={context.open}
    >
      <SelectAdaptHiddenContext.Provider value={isAdaptFullyHidden}>
        {props.children}
      </SelectAdaptHiddenContext.Provider>
    </Sheet.Controller>
  );
}

function SelectContent(props: SelectContentProps) {
  const { children, scope, ...focusScopeProps } = props;
  const context = useSelectContext(scope);
  const itemParentContext = useSelectItemParentContext(scope);
  const zIndex = React.useContext(SelectZIndexContext);
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const isAdaptFullyHidden = React.useContext(SelectAdaptHiddenContext);

  if (itemParentContext.shouldRenderWebNative) {
    return <>{children}</>;
  }

  if (isAdapted) {
    if (!context.open && isAdaptFullyHidden) {
      return null;
    }

    return <>{children}</>;
  }

  return (
    <Portal open={context.open} stackZIndex={100_000} zIndex={zIndex}>
      <RemoveScroll enabled={context.open && !context.disablePreventBodyScroll}>
        <Dismissable
          asChild
          forceUnmount={!context.open}
          onDismiss={() => itemParentContext.setOpen(false)}
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <FocusScope
            {...focusScopeProps}
            enabled={!!context.open}
            trapped
            onMountAutoFocus={(event) => {
              event.preventDefault();
            }}
            onUnmountAutoFocus={(event) => {
              event.preventDefault();
              const trigger = context.floatingContext?.refs?.reference?.current;

              if (trigger instanceof HTMLElement) {
                trigger.focus();
              }
            }}
          >
            {isTamaguiWeb ? <div style={{ display: "contents" }}>{children}</div> : children}
          </FocusScope>
        </Dismissable>
      </RemoveScroll>
    </Portal>
  );
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
  const { nativeHaptics, onPress, ...triggerProps } = props;
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const handlePress: NonNullable<SelectTriggerProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(resolvedNativeHaptics);
  };

  return <TamaguiSelect.Trigger {...triggerProps} onPress={handlePress} />;
}

function SelectValue(props: SelectValueProps) {
  return <TamaguiSelect.Value {...props} />;
}

function SelectViewport(props: SelectViewportProps) {
  const {
    children,
    scope,
    unstyled,
    borderColor,
    borderWidth,
    outlineWidth,
    disableScroll,
    style,
    ...viewportProps
  } = props;
  const shouldUseHeadlessWebViewport = isWeb() && unstyled == null;
  const context = useSelectContext(scope);
  const itemParentContext = useSelectItemParentContext(scope);
  const adaptContext = useAdaptContext();
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const isAdaptFullyHidden = React.useContext(SelectAdaptHiddenContext);
  const themeName = useThemeName();
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

  if (!isWeb() && isAdapted) {
    const contents = (
      <Theme name={themeName}>
        <ForwardSelectContext context={context} itemContext={itemParentContext}>
          <AdaptContext.Provider {...adaptContext}>{children}</AdaptContext.Provider>
        </ForwardSelectContext>
      </Theme>
    );

    if (!context.open && isAdaptFullyHidden) {
      if (context.lazyMount && context.renderValue) {
        return null;
      }

      return <YStack display="none">{contents}</YStack>;
    }

    return <AdaptPortalContents scope={context.adaptScope}>{contents}</AdaptPortalContents>;
  }

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

const selectAdaptWhen = isWeb() ? "md" : true;

/** Android 原生 Picker Dialog：隐藏渲染 Picker 并通过 focus() 触发系统 dialog */
function NativePickerDialog({
  visible,
  value,
  items,
  mode,
  onValueChange,
  onBlur,
}: {
  visible: boolean;
  value: string | undefined;
  items: ResolvedSelectItemData[];
  mode: "dialog" | "dropdown";
  onValueChange: (itemValue: string) => void;
  onBlur: () => void;
}) {
  const pickerRef = useRef<any>(null);
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => pickerRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const selectedBg = theme.backgroundPress?.val ?? "rgba(0,0,0,0.06)";
  const selectedColor = theme.color?.val ?? "#1A73E8";

  return (
    <View style={{ position: "absolute", opacity: 0, pointerEvents: "none", minWidth: 320 }}>
      <RNPPicker
        ref={pickerRef}
        selectedValue={value ?? ""}
        onValueChange={onValueChange}
        onBlur={onBlur}
        mode={mode}
      >
        {items.map((item) => {
          const isSelected = item.value === value;

          return (
            <RNPPicker.Item
              key={item.value}
              label={item.label}
              value={item.value}
              enabled={!(item.disabled ?? item.isDisabled)}
              style={{
                backgroundColor: isSelected ? selectedBg : "transparent",
                color: isSelected ? selectedColor : undefined,
              }}
            />
          );
        })}
      </RNPPicker>
    </View>
  );
}

/** 基于 Menu 组件的原生选择器（Android / iOS 均可） */
function NativeMenuSelect({
  items,
  value,
  placeholder,
  disabled,
  isDisabled,
  onValueChange,
  resolvedNativeHaptics,
}: {
  items: ResolvedSelectItemData[];
  value: string | null | undefined;
  placeholder?: React.ReactNode;
  disabled?: boolean;
  isDisabled?: boolean;
  onValueChange?: (value: string | null) => void;
  resolvedNativeHaptics: ReturnType<typeof useResolvedNativeHaptics>;
}) {
  const selectedLabel = items.find((item) => item.value === value)?.label ?? null;
  const handleSelect = useCallback(
    (itemValue: string) => {
      onValueChange?.(itemValue || null);
      triggerNativeHaptics(resolvedNativeHaptics);
    },
    [onValueChange, resolvedNativeHaptics],
  );

  return (
    <Menu
      trigger={
        <YStack
          disabled={disabled ?? isDisabled}
          background="$background"
          borderColor="$borderColor"
          borderWidth={1}
          opacity={(disabled ?? isDisabled) ? 0.5 : 1}
          style={{
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: 180,
          }}
        >
          <Text fontSize="$4" color="$color">
            {selectedLabel ?? (typeof placeholder === "string" ? placeholder : "选择")}
          </Text>
          <ChevronDown size={16} color="$color10" />
        </YStack>
      }
    >
      {items.map((item) => (
        <Menu.Item
          key={item.value}
          onSelect={() => handleSelect(item.value)}
          disabled={item.disabled ?? item.isDisabled}
        >
          <Menu.ItemTitle style={{ flex: 1 }}>{item.label}</Menu.ItemTitle>
          {item.value === value && <Check size={16} color="$color10" />}
        </Menu.Item>
      ))}
    </Menu>
  );
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
      itemGroups,
      itemProps,
      itemTextProps,
      items,
      itemLabel,
      itemLabelProps,
      nativeHaptics,
      nativePickerMode,
      onOpenChange,
      onValueChange,
      options,
      placeholder,
      touchSheetMaxHeight,
      triggerProps,
      viewportProps,
      native,
      ...props
    },
    ref,
  ) => {
    void ref;

    const platform = os();
    const [nativePickerVisible, setNativePickerVisible] = React.useState(false);
    const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
    const shouldUseTouchSheetLayout = !isWeb();
    const resolvedPickerMode =
      nativePickerMode ??
      (platform === "android"
        ? DEFAULT_ANDROID_NATIVE_PICKER_MODE
        : DEFAULT_IOS_NATIVE_PICKER_MODE);
    const resolvedItemGroups = resolveSelectItemGroups({ itemGroups, items, options });
    const resolvedItems = resolvedItemGroups.flatMap((group) => group.items);
    const getGroupLabel = (group: ResolvedSelectItemGroupData, groupIndex: number) =>
      group.label ?? (groupIndex === 0 ? itemLabel : null);
    const groupLabelCount = resolvedItemGroups.filter(
      (group, groupIndex) => getGroupLabel(group, groupIndex) != null,
    ).length;
    const touchSheetConfig = resolveTouchSheetConfig({
      groupCount: resolvedItemGroups.length,
      groupLabelCount,
      itemCount: resolvedItems.length,
      touchSheetMaxHeight,
    });
    const shouldRenderNativeOptionText = isWeb() && !!native;
    const renderedItemGroups: ResolvedSelectItemGroupData[] = shouldRenderNativeOptionText
      ? [{ key: "native", items: resolvedItems }]
      : resolvedItemGroups;
    const getItemLabelByValue = (value: string | null | undefined) =>
      resolvedItems.find((item) => item.value === value)?.label ?? null;
    const selectedItem = getItemLabelByValue(props.value ?? null);
    const renderItem = (item: ResolvedSelectItemData) => (
      <SelectItem
        {...(shouldUseTouchSheetLayout
          ? {
              background: "transparent",
              borderRadius: 0,
              height: DEFAULT_TOUCH_SHEET_ITEM_HEIGHT,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }
          : null)}
        {...itemProps}
        aria-label={resolveAriaLabel(item["aria-label"] ?? itemProps?.["aria-label"], item.label)}
        disabled={item.disabled ?? item.isDisabled ?? itemProps?.disabled}
        index={item.index}
        key={item.value}
        textValue={item.label}
        value={item.value}
      >
        {shouldRenderNativeOptionText ? (
          item.label
        ) : (
          <YStack
            background={shouldUseTouchSheetLayout ? TOUCH_SHEET_GROUP_BACKGROUND : undefined}
            borderBottomColor={shouldUseTouchSheetLayout ? TOUCH_SHEET_SEPARATOR_COLOR : undefined}
            borderBottomWidth={shouldUseTouchSheetLayout && !item.isLastInGroup ? 1 : 0}
            style={
              shouldUseTouchSheetLayout
                ? TOUCH_SELECT_ITEM_CONTENT_STYLE
                : DEFAULT_SELECT_ITEM_CONTENT_STYLE
            }
          >
            {item.startContent}
            <SelectItemText
              fontSize={shouldUseTouchSheetLayout ? "$4" : undefined}
              lineHeight={shouldUseTouchSheetLayout ? 22 : undefined}
              {...itemTextProps}
            >
              {item.label}
            </SelectItemText>
            {item.description}
            {item.endContent}
            <SelectItemIndicator marginLeft="auto" {...itemIndicatorProps}>
              {itemIndicatorProps?.children ??
                (shouldUseTouchSheetLayout ? <Check size={22} /> : undefined)}
            </SelectItemIndicator>
          </YStack>
        )}
      </SelectItem>
    );
    const renderGroup = (group: ResolvedSelectItemGroupData, groupIndex: number) => {
      const label = getGroupLabel(group, groupIndex);
      const content = (
        <SelectGroup>
          {label && (
            <Select.Label
              fontWeight="700"
              style={
                shouldUseTouchSheetLayout
                  ? { paddingHorizontal: 24, paddingVertical: 10 }
                  : undefined
              }
              {...itemLabelProps}
            >
              {label}
            </Select.Label>
          )}
          {group.items.map(renderItem)}
        </SelectGroup>
      );

      if (!shouldUseTouchSheetLayout) {
        return <React.Fragment key={group.key}>{content}</React.Fragment>;
      }

      return (
        <YStack
          key={group.key}
          background={TOUCH_SHEET_GROUP_BACKGROUND}
          style={{
            borderRadius: TOUCH_SHEET_GROUP_RADIUS,
            marginBottom:
              groupIndex === resolvedItemGroups.length - 1 ? 0 : DEFAULT_TOUCH_SHEET_GROUP_GAP,
            overflow: "hidden",
            width: "100%",
          }}
        >
          {content}
        </YStack>
      );
    };

    const shouldRenderNativePicker =
      !isWeb() &&
      !!native &&
      resolvedPickerMode !== "menu" &&
      (resolvedPickerMode !== "dialog" || platform === "android");
    const shouldRenderNativeMenu =
      !isWeb() && !!native && resolvedPickerMode === "menu" && platform === "ios";

    const handleTamaguiOpenChange = (nextOpen: boolean) => {
      if (shouldRenderNativePicker && nextOpen) {
        setNativePickerVisible((prev) => {
          if (prev) {
            requestAnimationFrame(() => setNativePickerVisible(true));
            return false;
          }
          return true;
        });
        return;
      }

      onOpenChange?.(nextOpen);
      if (nextOpen) triggerNativeHaptics(resolvedNativeHaptics);
    };

    const handleTamaguiValueChange = (nextValue: string) => {
      onValueChange?.(nextValue ?? null);
      triggerNativeHaptics(resolvedNativeHaptics);
    };

    return (
      <>
        {shouldRenderNativeMenu ? (
          <NativeMenuSelect
            items={resolvedItems}
            value={props.value}
            placeholder={placeholder}
            disabled={disabled}
            isDisabled={isDisabled}
            onValueChange={onValueChange}
            resolvedNativeHaptics={resolvedNativeHaptics}
          />
        ) : (
          <TamaguiSelect
            disablePreventBodyScroll
            {...props}
            open={shouldRenderNativePicker ? false : undefined}
            native={native}
            onOpenChange={handleTamaguiOpenChange}
            onValueChange={handleTamaguiValueChange}
            renderValue={props.renderValue ?? ((nextValue) => getItemLabelByValue(nextValue))}
          >
            {children ??
              (resolvedItems.length === 0 ? null : (
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
                    nativeHaptics={triggerProps?.nativeHaptics ?? resolvedNativeHaptics}
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>

                  <SelectSheetController>
                    <SelectAdapt when={selectAdaptWhen} platform="touch">
                      <Sheet
                        native={!!native}
                        modal
                        dismissOnSnapToBottom
                        snapPoints={touchSheetConfig.snapPoints}
                        snapPointsMode={touchSheetConfig.snapPointsMode}
                        transitionConfig={{ type: "timing", duration: 150 }}
                      >
                        <Sheet.Frame
                          {...(touchSheetConfig.frameMaxHeight != null
                            ? { maxHeight: touchSheetConfig.frameMaxHeight }
                            : null)}
                          {...(shouldUseTouchSheetLayout
                            ? {
                                backgroundColor: TOUCH_SHEET_FRAME_BACKGROUND,
                                borderTopLeftRadius: 36,
                                borderTopRightRadius: 36,
                                paddingTop: 12,
                              }
                            : null)}
                        >
                          {shouldUseTouchSheetLayout && (
                            <Sheet.Handle
                              alignSelf="center"
                              backgroundColor="$color8"
                              borderRadius={999}
                              height={5}
                              marginBottom={6}
                              opacity={0.65}
                              onPress={() => {}}
                              width={92}
                            />
                          )}
                          {shouldUseTouchSheetLayout ? (
                            touchSheetConfig.shouldEnableScroll ? (
                              <Sheet.ScrollView
                                sheetDragDisabledScrollIndicatorWidth={44}
                                showsVerticalScrollIndicator
                              >
                                <YStack
                                  background={TOUCH_SHEET_FRAME_BACKGROUND}
                                  style={TOUCH_SHEET_SCROLL_CONTENT_STYLE}
                                >
                                  <SelectAdapt.Contents />
                                </YStack>
                              </Sheet.ScrollView>
                            ) : (
                              <YStack
                                background={TOUCH_SHEET_FRAME_BACKGROUND}
                                style={TOUCH_SHEET_SCROLL_CONTENT_STYLE}
                              >
                                <SelectAdapt.Contents />
                              </YStack>
                            )
                          ) : (
                            <Sheet.ScrollView>
                              <SelectAdapt.Contents />
                            </Sheet.ScrollView>
                          )}
                        </Sheet.Frame>
                        <Sheet.Overlay
                          bg="$shadowColor"
                          transition="lazy"
                          enterStyle={{ opacity: 0 }}
                          exitStyle={{ opacity: 0 }}
                        />
                      </Sheet>
                    </SelectAdapt>

                    <SelectContent {...contentProps}>
                      {!shouldUseTouchSheetLayout && (
                        <SelectScrollUpButton
                          items="center"
                          justify="center"
                          position="relative"
                          width="100%"
                          height="$3"
                        />
                      )}
                      <SelectViewport
                        bg="$background"
                        rounded="$4"
                        borderWidth={1}
                        borderColor="$borderColor"
                        {...viewportProps}
                      >
                        {renderedItemGroups.map(renderGroup)}
                        {isWeb() && native && (
                          <YStack
                            position="absolute"
                            r={0}
                            t={16}
                            items="center"
                            justify="center"
                            width={"$4"}
                            pointerEvents="none"
                          >
                            <ChevronDown
                              size={getFontSize((props.size as FontSizeTokens) ?? "$true")}
                            />
                          </YStack>
                        )}
                      </SelectViewport>
                      {!shouldUseTouchSheetLayout && (
                        <SelectScrollDownButton
                          items="center"
                          justify="center"
                          position="relative"
                          width="100%"
                          height="$3"
                        />
                      )}
                    </SelectContent>
                  </SelectSheetController>
                </>
              ))}
          </TamaguiSelect>
        )}

        {shouldRenderNativePicker && (
          <NativePickerDialog
            visible={nativePickerVisible}
            value={(props.value as string | undefined) ?? ""}
            items={resolvedItems}
            mode={resolvedPickerMode as "dialog" | "dropdown"}
            onValueChange={(itemValue: string) => {
              onValueChange?.(itemValue || null);
              triggerNativeHaptics(resolvedNativeHaptics);
              setNativePickerVisible(false);
            }}
            onBlur={() => setNativePickerVisible(false)}
          />
        )}
      </>
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
