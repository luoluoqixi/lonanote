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
import { forwardRef } from "react";
import React from "react";
import { FontSizeTokens, Select as TamaguiSelect, YStack, getFontSize } from "tamagui";
import { LinearGradient } from "tamagui/linear-gradient";

import { isWeb } from "@/api/common/platform";
import { Sheet } from "@/components/ui/sheet";
import {
  resolveAriaLabel,
  triggerNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

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

const DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT = 6;
const DEFAULT_TOUCH_SHEET_ITEM_HEIGHT = 48;
const DEFAULT_TOUCH_SHEET_CHROME_HEIGHT = 72;
const DEFAULT_TOUCH_SHEET_LABEL_HEIGHT = 32;
const DEFAULT_TOUCH_ITEM_CONTENT_STYLE = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
} as const;

const SelectAdaptHiddenContext = React.createContext(true);

type TouchSheetConfig = {
  frameMaxHeight?: SelectProps["touchSheetMaxHeight"];
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
  itemCount,
  itemLabel,
  touchSheetMaxHeight,
}: {
  itemCount: number;
  itemLabel: React.ReactNode;
  touchSheetMaxHeight: SelectProps["touchSheetMaxHeight"];
}): TouchSheetConfig {
  if (typeof touchSheetMaxHeight === "number" && Number.isFinite(touchSheetMaxHeight)) {
    return {
      snapPoints: [Math.max(1, Math.round(touchSheetMaxHeight))],
      snapPointsMode: "constant",
    };
  }

  const percentSnapPoint = parsePercentSnapPoint(touchSheetMaxHeight);

  if (percentSnapPoint != null) {
    return {
      snapPoints: [percentSnapPoint],
      snapPointsMode: "percent",
    };
  }

  const visibleItemCount = Math.min(Math.max(itemCount, 1), DEFAULT_TOUCH_SHEET_VISIBLE_ITEM_COUNT);
  const estimatedHeight =
    visibleItemCount * DEFAULT_TOUCH_SHEET_ITEM_HEIGHT +
    DEFAULT_TOUCH_SHEET_CHROME_HEIGHT +
    (itemLabel == null ? 0 : DEFAULT_TOUCH_SHEET_LABEL_HEIGHT);

  return {
    ...(touchSheetMaxHeight != null ? { frameMaxHeight: touchSheetMaxHeight } : null),
    snapPoints: [estimatedHeight],
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
      nativeHaptics,
      onOpenChange,
      onValueChange,
      options,
      placeholder,
      touchSheetMaxHeight,
      triggerProps,
      viewportProps,
      ...props
    },
    ref,
  ) => {
    void ref;
    const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
    const resolvedItems = items ?? options;
    const touchSheetConfig = resolveTouchSheetConfig({
      itemCount: resolvedItems?.length ?? 0,
      itemLabel,
      touchSheetMaxHeight,
    });
    const shouldRenderNativeOptionText = isWeb() && !!props.native;
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
        {shouldRenderNativeOptionText ? (
          item.label
        ) : (
          <YStack style={DEFAULT_TOUCH_ITEM_CONTENT_STYLE}>
            {item.startContent}
            <SelectItemText {...itemTextProps}>{item.label}</SelectItemText>
            {item.description}
            {item.endContent}
            <SelectItemIndicator marginLeft="auto" {...itemIndicatorProps} />
          </YStack>
        )}
      </SelectItem>
    ));

    return (
      <TamaguiSelect
        disablePreventBodyScroll
        {...props}
        onOpenChange={(nextOpen) => {
          onOpenChange?.(nextOpen);

          if (!nextOpen) {
            return;
          }

          triggerNativeHaptics(resolvedNativeHaptics);
        }}
        onValueChange={(nextValue) => {
          onValueChange?.(nextValue ?? null);
          triggerNativeHaptics(resolvedNativeHaptics);
        }}
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
                nativeHaptics={triggerProps?.nativeHaptics ?? resolvedNativeHaptics}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>

              <SelectSheetController>
                <SelectAdapt when={selectAdaptWhen} platform="touch">
                  <Sheet
                    native={!!props.native}
                    modal
                    dismissOnSnapToBottom
                    snapPoints={touchSheetConfig.snapPoints}
                    snapPointsMode={touchSheetConfig.snapPointsMode}
                    transitionConfig={{ type: "timing", duration: 150 }}
                  >
                    <Sheet.Frame
                      {...(touchSheetConfig.frameMaxHeight != null
                        ? { style: { maxHeight: touchSheetConfig.frameMaxHeight } }
                        : null)}
                    >
                      <Sheet.ScrollView>
                        <SelectAdapt.Contents />
                      </Sheet.ScrollView>
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
                        <ChevronDown
                          size={getFontSize((props.size as FontSizeTokens) ?? "$true")}
                        />
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
              </SelectSheetController>
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
