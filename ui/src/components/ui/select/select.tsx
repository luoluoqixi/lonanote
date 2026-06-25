import {
  AdaptContext,
  AdaptPortalContents,
  useAdaptContext,
  useAdaptIsActive,
} from "@tamagui/adapt";
import { Theme, isWeb as isTamaguiWeb, useThemeName } from "@tamagui/core";
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
import { forwardRef, useCallback, useRef } from "react";
import React from "react";
import { FontSizeTokens, Select as TamaguiSelect, YStack, getFontSize } from "tamagui";
import { LinearGradient } from "tamagui/linear-gradient";

import { isWeb, os } from "@/api/common/platform";
import { Sheet } from "@/components/ui/sheet";
import {
  resolveAriaLabel,
  triggerNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

import { NativePickerDialog, NativePickerSwiftUI } from "./native_picker";
import { NativeTriggerFace } from "./native_trigger";
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
  SelectNativeMode,
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
const DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_TOP = 4;
const DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_BOTTOM = 0;
const DEFAULT_IOS_NATIVE_SHEET_SECTION_CHROME_HEIGHT = 8;
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
const IOS_NATIVE_SHEET_SCROLL_CONTENT_STYLE = {
  paddingBottom: 0,
  paddingHorizontal: 4,
  paddingTop: 0,
  width: "100%",
} as const;
const TOUCH_SHEET_GROUP_RADIUS = 24;
const TOUCH_SHEET_FRAME_BACKGROUND = "$backgroundPress" as const;
const TOUCH_SHEET_GROUP_BACKGROUND = "$background" as const;
const TOUCH_SHEET_SEPARATOR_COLOR = "$borderColor" as const;

const DEFAULT_ANDROID_NATIVE_PICKER_MODE: NativePickerMode = "dropdown";
const DEFAULT_IOS_NATIVE_PICKER_MODE: NativePickerMode = "dropdown";
const DEFAULT_NATIVE = !isWeb();

const SelectAdaptHiddenContext = React.createContext(true);

type TouchSheetConfig = {
  frameMaxHeight?: SelectProps["touchSheetMaxHeight"];
  shouldEnableScroll: boolean;
  snapPoints: [number];
  snapPointsMode: "constant" | "percent";
};

type ResolvedSelectBehavior = {
  shouldRenderNativeOptionText: boolean;
  shouldUseCustomSheet: boolean;
  shouldUseNativePicker: boolean;
  shouldUseNativeSheet: boolean;
  tamaguiNative: boolean;
};

type SelectSheetBaseProps = {
  initialScrollY?: number | null;
  isNativeSheet?: boolean;
  sheetScrollRef: React.RefObject<any>;
  shouldUseTouchSheetLayout: boolean;
  touchSheetConfig: TouchSheetConfig;
};

function resolveSelectBehavior(native: SelectNativeMode | undefined): ResolvedSelectBehavior {
  const resolvedNative = native ?? DEFAULT_NATIVE;

  if (isWeb()) {
    return {
      shouldRenderNativeOptionText: resolvedNative !== false,
      shouldUseCustomSheet: false,
      shouldUseNativePicker: resolvedNative === true,
      shouldUseNativeSheet: false,
      tamaguiNative: resolvedNative !== false,
    };
  }

  const tameguiNative =
    resolvedNative === true || resolvedNative === false || resolvedNative === "native-sheet";

  return {
    shouldRenderNativeOptionText: false,
    shouldUseCustomSheet: resolvedNative === "custom-sheet",
    shouldUseNativePicker: resolvedNative === true,
    shouldUseNativeSheet: resolvedNative === false || resolvedNative === "native-sheet",
    tamaguiNative: tameguiNative,
  };
}

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
  isNativeSheet,
  itemCount,
  touchSheetMaxHeight,
}: {
  groupCount: number;
  groupLabelCount: number;
  isNativeSheet: boolean;
  itemCount: number;
  touchSheetMaxHeight: SelectProps["touchSheetMaxHeight"];
}): TouchSheetConfig {
  const totalItemCount = Math.max(itemCount, 1);
  const visibleItemCount = Math.min(totalItemCount, DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT);
  const visibleGroupGapCount = Math.max(Math.min(groupCount, visibleItemCount) - 1, 0);
  const sectionChromeHeight = isNativeSheet
    ? groupCount * DEFAULT_IOS_NATIVE_SHEET_SECTION_CHROME_HEIGHT
    : 0;
  const visibleSectionChromeHeight = isNativeSheet
    ? Math.min(groupCount, visibleItemCount) * DEFAULT_IOS_NATIVE_SHEET_SECTION_CHROME_HEIGHT
    : 0;
  const nativeListMargins = isNativeSheet
    ? DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_TOP + DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_BOTTOM
    : 0;
  const estimatedVisibleContentHeight =
    visibleItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    visibleGroupGapCount * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT +
    visibleSectionChromeHeight +
    nativeListMargins;
  const estimatedContentHeight =
    totalItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    Math.max(groupCount - 1, 0) * DEFAULT_TOUCH_SHEET_GROUP_GAP +
    groupLabelCount * DEFAULT_TOUCH_SHEET_LABEL_HEIGHT +
    sectionChromeHeight +
    nativeListMargins;
  const estimatedVisibleHeight = estimatedVisibleContentHeight + DEFAULT_TOUCH_SHEET_CHROME_HEIGHT;
  const estimatedSheetContentHeight = estimatedContentHeight + DEFAULT_TOUCH_SHEET_CHROME_HEIGHT;
  if (typeof touchSheetMaxHeight === "number" && Number.isFinite(touchSheetMaxHeight)) {
    const snapPoint = Math.max(1, Math.round(touchSheetMaxHeight));

    return {
      shouldEnableScroll: estimatedSheetContentHeight > snapPoint,
      snapPoints: [snapPoint],
      snapPointsMode: "constant",
    };
  }

  const percentSnapPoint = parsePercentSnapPoint(touchSheetMaxHeight);

  if (percentSnapPoint != null) {
    return {
      shouldEnableScroll: estimatedSheetContentHeight > estimatedVisibleHeight,
      snapPoints: [percentSnapPoint],
      snapPointsMode: "percent",
    };
  }

  return {
    ...(touchSheetMaxHeight != null ? { frameMaxHeight: touchSheetMaxHeight } : null),
    shouldEnableScroll: estimatedSheetContentHeight > estimatedVisibleHeight,
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

function SelectCustomSheet({
  initialScrollY,
  isNativeSheet,
  sheetScrollRef,
  shouldUseTouchSheetLayout,
  touchSheetConfig,
}: SelectSheetBaseProps) {
  return (
    <Sheet
      native={false}
      modal
      dismissOnSnapToBottom
      snapPoints={touchSheetConfig.snapPoints}
      snapPointsMode={touchSheetConfig.snapPointsMode}
      transitionConfig={{ type: "timing", duration: 150 }}
    >
      <SelectSheetFrame
        initialScrollY={initialScrollY}
        isNativeSheet={isNativeSheet}
        sheetScrollRef={sheetScrollRef}
        shouldUseTouchSheetLayout={shouldUseTouchSheetLayout}
        touchSheetConfig={touchSheetConfig}
      />
      <Sheet.Overlay
        bg="$shadowColor"
        transition="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
    </Sheet>
  );
}

function SelectNativeSheet({
  initialScrollY,
  sheetScrollRef,
  shouldUseTouchSheetLayout,
  touchSheetConfig,
}: SelectSheetBaseProps) {
  return (
    <Sheet
      native
      modal
      dismissOnSnapToBottom
      snapPoints={touchSheetConfig.snapPoints}
      snapPointsMode={touchSheetConfig.snapPointsMode}
      transitionConfig={{ type: "timing", duration: 150 }}
    >
      <SelectSheetFrame
        initialScrollY={initialScrollY}
        isNativeSheet
        sheetScrollRef={sheetScrollRef}
        shouldUseTouchSheetLayout={shouldUseTouchSheetLayout}
        touchSheetConfig={touchSheetConfig}
      />
      <Sheet.Overlay
        bg="$shadowColor"
        transition="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
    </Sheet>
  );
}

function SelectSheetFrame({
  initialScrollY,
  isNativeSheet,
  sheetScrollRef,
  shouldUseTouchSheetLayout,
  touchSheetConfig,
}: SelectSheetBaseProps) {
  if (shouldUseTouchSheetLayout && isNativeSheet) {
    return (
      <Sheet.Frame
        {...(touchSheetConfig.frameMaxHeight != null
          ? { maxHeight: touchSheetConfig.frameMaxHeight }
          : null)}
        borderTopLeftRadius={36}
        borderTopRightRadius={36}
        style={{ flex: 1, minHeight: 0, paddingTop: 12 }}
      >
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
        <YStack style={{ ...IOS_NATIVE_SHEET_SCROLL_CONTENT_STYLE, flex: 1, minHeight: 0 }}>
          <SelectAdapt.Contents />
        </YStack>
      </Sheet.Frame>
    );
  }

  return (
    <Sheet.Frame
      {...(touchSheetConfig.frameMaxHeight != null
        ? { maxHeight: touchSheetConfig.frameMaxHeight }
        : null)}
      {...(shouldUseTouchSheetLayout
        ? {
            ...(isNativeSheet ? null : { backgroundColor: TOUCH_SHEET_FRAME_BACKGROUND }),
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
            contentOffset={initialScrollY != null ? { x: 0, y: initialScrollY } : undefined}
            ref={sheetScrollRef}
            extraBottomPadding={isNativeSheet ? 0 : undefined}
            sheetDragDisabledScrollIndicatorWidth={44}
            showsVerticalScrollIndicator
          >
            <YStack
              {...(!isNativeSheet ? { background: TOUCH_SHEET_FRAME_BACKGROUND } : null)}
              style={{
                ...(isNativeSheet
                  ? IOS_NATIVE_SHEET_SCROLL_CONTENT_STYLE
                  : TOUCH_SHEET_SCROLL_CONTENT_STYLE),
                ...(isNativeSheet ? { paddingBottom: 0 } : null),
              }}
            >
              <SelectAdapt.Contents />
            </YStack>
          </Sheet.ScrollView>
        ) : (
          <YStack
            {...(!isNativeSheet ? { background: TOUCH_SHEET_FRAME_BACKGROUND } : null)}
            style={{
              ...(isNativeSheet
                ? IOS_NATIVE_SHEET_SCROLL_CONTENT_STYLE
                : TOUCH_SHEET_SCROLL_CONTENT_STYLE),
              ...(isNativeSheet ? { paddingBottom: 0 } : null),
            }}
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
  );
}

function SelectSheetController(props: {
  children: React.ReactNode;
  onOpenAnimationComplete?: () => void;
  shouldRunOpenAnimationComplete?: boolean;
}) {
  const context = useSelectContext();
  const itemParentContext = useSelectItemParentContext();
  const isAdapted = useAdaptIsActive(context.adaptScope);
  const [isAdaptFullyHidden, setIsAdaptFullyHidden] = React.useState(!context.open);
  const hasScrolledRef = useRef(false);

  React.useEffect(() => {
    if (context.open) {
      setIsAdaptFullyHidden(false);
    } else {
      // Sheet 关闭时重置，下次打开可再次滚动
      hasScrolledRef.current = false;
    }
  }, [context.open]);

  const handleSheetAnimationComplete = React.useCallback(
    ({ open: sheetOpen }: { open: boolean }) => {
      if (!sheetOpen) {
        setIsAdaptFullyHidden(true);
        hasScrolledRef.current = false;
      } else if (!hasScrolledRef.current) {
        // 仅首次打开动画完成时滚动到选中项，松手回弹等重新显示不再触发
        hasScrolledRef.current = true;
        if (props.shouldRunOpenAnimationComplete !== false) {
          props.onOpenAnimationComplete?.();
        }
      }
    },
    [props.onOpenAnimationComplete, props.shouldRunOpenAnimationComplete],
  );

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
    const shouldWrapPortalContents = style != null;
    const contents = (
      <Theme name={themeName}>
        <ForwardSelectContext context={context} itemContext={itemParentContext}>
          <AdaptContext.Provider {...adaptContext}>
            {shouldWrapPortalContents ? <YStack style={style}>{children}</YStack> : children}
          </AdaptContext.Provider>
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

function getNativeListModule() {
  return require("../native_list") as typeof import("../native_list");
}

function IosNativeSheetSelectList({
  initialScrollTarget,
  itemGroups,
  itemLabel,
  nativeHaptics,
  value,
}: {
  initialScrollTarget?: string | number;
  itemGroups: ResolvedSelectItemGroupData[];
  itemLabel?: React.ReactNode;
  nativeHaptics?: SelectProps["nativeHaptics"];
  value?: string | null;
}) {
  const { NativeList, NativeListItem, NativeListSection } = getNativeListModule();
  const itemParentContext = useSelectItemParentContext();

  return (
    <NativeList
      native
      scrollable
      contentMarginBottom={DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_BOTTOM}
      contentMarginTop={DEFAULT_IOS_NATIVE_LIST_CONTENT_MARGIN_TOP}
      initialScrollTarget={initialScrollTarget}
      style={{ flex: 1, minHeight: 0, width: "100%" }}
    >
      {itemGroups.map((group, groupIndex) => {
        const groupLabel = group.label ?? (groupIndex === 0 ? itemLabel : null);

        return (
          <NativeListSection key={group.key} title={groupLabel}>
            {group.items.map((item) => {
              const disabled = item.disabled ?? item.isDisabled;

              return (
                <NativeListItem
                  chevron={false}
                  disabled={disabled}
                  key={item.value}
                  nativeHaptics={nativeHaptics}
                  nativeScrollId={item.value}
                  onPress={
                    disabled
                      ? undefined
                      : () => {
                          itemParentContext.onChange(item.value);
                          itemParentContext.setSelectedItem(item.label);
                          itemParentContext.setOpen(false);
                        }
                  }
                  selected={item.value === value}
                  title={item.label}
                />
              );
            })}
          </NativeListSection>
        );
      })}
    </NativeList>
  );
}

const selectAdaptWhen = isWeb() ? "md" : true;

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
      nativeTrigger,
      nativeTriggerContainerStyle,
      nativeTriggerContent,
      nativeTriggerIcon,
      nativeTriggerLabelProps,
      ...props
    },
    ref,
  ) => {
    void ref;
    const selectBehavior = resolveSelectBehavior(native);
    const platform = os();
    const [nativePickerVisible, setNativePickerVisible] = React.useState(false);
    const sheetScrollRef = useRef<any>(null);
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
    const shouldUseIosNativeSheetList = platform === "ios" && selectBehavior.shouldUseNativeSheet;
    const touchSheetConfig = resolveTouchSheetConfig({
      groupCount: resolvedItemGroups.length,
      groupLabelCount,
      isNativeSheet: shouldUseIosNativeSheetList,
      itemCount: resolvedItems.length,
      touchSheetMaxHeight,
    });
    const shouldRenderNativeOptionText = selectBehavior.shouldRenderNativeOptionText;
    const renderedItemGroups: ResolvedSelectItemGroupData[] = shouldRenderNativeOptionText
      ? [{ key: "native", items: resolvedItems }]
      : resolvedItemGroups;
    const getItemLabelByValue = (value: string | null | undefined) =>
      resolvedItems.find((item) => item.value === value)?.label ?? null;
    const selectedItem = getItemLabelByValue(props.value ?? null);
    const triggerLabel = selectedItem ?? placeholder ?? "";
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

    /**
     * NativePickerDialog（隐藏渲染 + focus() 触发系统弹窗）仅在 Android 上可用。
     * wheel 为 iOS 专用模式，Android 上不走此路径。
     */
    const shouldRenderNativePicker =
      !isWeb() &&
      selectBehavior.shouldUseNativePicker &&
      resolvedPickerMode !== "wheel" &&
      platform === "android" &&
      !nativeTrigger;
    /**
     * iOS native 始终走平台 wrapper。
     * Android 在 nativeTrigger=true 时也走同一层 wrapper，自绘 trigger + 原生 picker 弹层。
     */
    const shouldRenderNativePlatformPicker =
      !isWeb() &&
      selectBehavior.shouldUseNativePicker &&
      (platform === "ios" || (platform === "android" && !!nativeTrigger));

    const handleTamaguiOpenChange = (nextOpen: boolean) => {
      if (shouldRenderNativePicker && nextOpen) {
        triggerNativeHaptics(resolvedNativeHaptics);
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

    /** 打开 Sheet 时滚动到选中项位置 */
    const getSelectedItemScrollY = useCallback(() => {
      if (!shouldUseTouchSheetLayout || resolvedItems.length === 0) {
        return null;
      }

      const selectedValue = props.value ?? null;
      if (resolvedItems[0]?.value === selectedValue) {
        return null;
      }

      let accumY: number | null = null;
      let currentY = shouldUseIosNativeSheetList
        ? (IOS_NATIVE_SHEET_SCROLL_CONTENT_STYLE.paddingTop ?? 0)
        : (TOUCH_SHEET_SCROLL_CONTENT_STYLE.paddingTop ?? 0);

      for (const [groupIndex, group] of resolvedItemGroups.entries()) {
        const label = getGroupLabel(group, groupIndex);
        if (label != null) currentY += DEFAULT_TOUCH_SHEET_LABEL_HEIGHT;

        for (const item of group.items) {
          if (item.value === selectedValue) {
            accumY = currentY;
            break;
          }
          currentY += DEFAULT_TOUCH_SHEET_ITEM_HEIGHT;
        }
        if (accumY != null) break;
      }

      if (accumY == null || accumY <= 0) {
        return null;
      }

      return accumY;
    }, [
      shouldUseIosNativeSheetList,
      shouldUseTouchSheetLayout,
      resolvedItems.length,
      resolvedItemGroups,
      props.value,
      getGroupLabel,
    ]);

    const scrollToSelectedItem = useCallback(() => {
      if (shouldUseIosNativeSheetList) {
        return;
      }

      if (!sheetScrollRef.current) {
        return;
      }

      const selectedScrollY = getSelectedItemScrollY();
      if (selectedScrollY == null) {
        return;
      }

      sheetScrollRef.current.scrollTo({ y: selectedScrollY, animated: false });
    }, [getSelectedItemScrollY, shouldUseIosNativeSheetList]);
    const initialScrollY = getSelectedItemScrollY();
    const selectedNativeListInitialScrollTarget =
      shouldUseIosNativeSheetList && props.value != null && resolvedItems[0]?.value !== props.value
        ? props.value
        : undefined;

    return (
      <>
        {shouldRenderNativePlatformPicker ? (
          <NativePickerSwiftUI
            items={resolvedItems}
            value={props.value}
            placeholder={placeholder}
            mode={resolvedPickerMode as "dropdown" | "wheel" | "dialog"}
            nativeTrigger={nativeTrigger ?? false}
            nativeTriggerContainerStyle={nativeTriggerContainerStyle}
            nativeTriggerContent={nativeTriggerContent}
            nativeTriggerIcon={nativeTriggerIcon}
            nativeTriggerLabelProps={nativeTriggerLabelProps}
            onValueChange={onValueChange}
            resolvedNativeHaptics={resolvedNativeHaptics}
          />
        ) : (
          <TamaguiSelect
            disablePreventBodyScroll
            {...props}
            open={shouldRenderNativePicker ? false : undefined}
            native={selectBehavior.tamaguiNative}
            onOpenChange={handleTamaguiOpenChange}
            onValueChange={handleTamaguiValueChange}
            renderValue={props.renderValue ?? ((nextValue) => getItemLabelByValue(nextValue))}
          >
            {children ??
              (resolvedItems.length === 0 ? null : (
                <>
                  <SelectTrigger
                    disabled={disabled ?? isDisabled ?? triggerProps?.disabled}
                    {...(!nativeTrigger
                      ? {
                          backgroundColor: "$background",
                          borderRadius: "$4",
                          iconAfter: ChevronDown,
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          borderRadius: 0,
                          borderWidth: 0,
                          justifyContent: "center",
                          minHeight: 44,
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                          pressStyle: {
                            backgroundColor: "transparent",
                            borderColor: "transparent",
                            opacity: 0.6,
                          },
                        })}
                    {...triggerProps}
                    aria-label={resolveAriaLabel(
                      triggerProps?.["aria-label"] ?? ariaLabel,
                      selectedItem ?? placeholder,
                    )}
                    nativeHaptics={triggerProps?.nativeHaptics ?? resolvedNativeHaptics}
                  >
                    {nativeTrigger ? (
                      <NativeTriggerFace
                        content={nativeTriggerContent}
                        containerStyle={nativeTriggerContainerStyle}
                        icon={nativeTriggerIcon}
                        label={triggerLabel}
                        labelProps={nativeTriggerLabelProps}
                      />
                    ) : (
                      <SelectValue placeholder={placeholder} />
                    )}
                  </SelectTrigger>

                  <SelectSheetController
                    onOpenAnimationComplete={scrollToSelectedItem}
                    shouldRunOpenAnimationComplete={initialScrollY != null}
                  >
                    <SelectAdapt when={selectAdaptWhen} platform="touch">
                      {selectBehavior.shouldUseCustomSheet ? (
                        <SelectCustomSheet
                          initialScrollY={initialScrollY}
                          isNativeSheet={false}
                          sheetScrollRef={sheetScrollRef}
                          shouldUseTouchSheetLayout={shouldUseTouchSheetLayout}
                          touchSheetConfig={touchSheetConfig}
                        />
                      ) : selectBehavior.shouldUseNativeSheet ? (
                        <SelectNativeSheet
                          initialScrollY={initialScrollY}
                          sheetScrollRef={sheetScrollRef}
                          shouldUseTouchSheetLayout={shouldUseTouchSheetLayout}
                          touchSheetConfig={touchSheetConfig}
                        />
                      ) : (
                        <Sheet
                          modal
                          dismissOnSnapToBottom
                          snapPoints={touchSheetConfig.snapPoints}
                          snapPointsMode={touchSheetConfig.snapPointsMode}
                          transitionConfig={{ type: "timing", duration: 150 }}
                        >
                          <SelectSheetFrame
                            initialScrollY={initialScrollY}
                            isNativeSheet={false}
                            sheetScrollRef={sheetScrollRef}
                            shouldUseTouchSheetLayout={shouldUseTouchSheetLayout}
                            touchSheetConfig={touchSheetConfig}
                          />
                          <Sheet.Overlay
                            bg="$shadowColor"
                            transition="lazy"
                            enterStyle={{ opacity: 0 }}
                            exitStyle={{ opacity: 0 }}
                          />
                        </Sheet>
                      )}
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
                        style={
                          shouldUseIosNativeSheetList
                            ? [{ flex: 1, minHeight: 0, width: "100%" }, viewportProps?.style]
                            : viewportProps?.style
                        }
                      >
                        {shouldUseIosNativeSheetList ? (
                          <IosNativeSheetSelectList
                            initialScrollTarget={selectedNativeListInitialScrollTarget}
                            itemGroups={resolvedItemGroups}
                            itemLabel={itemLabel}
                            nativeHaptics={resolvedNativeHaptics}
                            value={props.value ?? null}
                          />
                        ) : (
                          renderedItemGroups.map(renderGroup)
                        )}
                        {isWeb() && selectBehavior.tamaguiNative && !nativeTrigger && (
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
