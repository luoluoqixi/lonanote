import {
  HStack,
  Host,
  Image,
  List,
  RNHostView,
  Spacer,
  Button as SwiftButton,
  Text as SwiftText,
  Section as SwiftUISection,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  contentMargins,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  listRowInsets,
  listSectionSpacing,
  listStyle,
  multilineTextAlignment,
  opacity,
  padding,
  scrollContentBackground,
  scrollDisabled,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { type ReactNode, createContext, useContext, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

import { NativePickerSwiftUI } from "../select/native_picker";
import type { NativePickerSwiftUIHandle } from "../select/native_picker";
import { resolveSelectItemGroups } from "../select/select_grouping";
import { Switch } from "../switch";
import { getTrueSheetScrollBottomPadding } from "../true_sheet/sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "../true_sheet/true_sheet_scroll_context";
import { toSwiftUIHexColor, triggerNativeHaptics, useResolvedNativeHaptics } from "../utils";
import {
  NativeListActionItem as FallbackActionItem,
  NativeListCustomItem as FallbackCustomItem,
  NativeListItem as FallbackItem,
  NativeListNavigationItem as FallbackNavigationItem,
  NativeListRoot as FallbackRoot,
  NativeListSection as FallbackSection,
  NativeListSelectItem as FallbackSelectItem,
  NativeListSwitchItem as FallbackSwitchItem,
} from "./native_list_fallback";
import type {
  NativeListActionItemProps,
  NativeListButtonItemProps,
  NativeListCustomItemProps,
  NativeListItemBaseProps,
  NativeListItemProps,
  NativeListNavigationItemProps,
  NativeListRootProps,
  NativeListSectionProps,
  NativeListSelectItemProps,
  NativeListSwitchItemProps,
} from "./types";

type NativeListContextValue = {
  native: boolean;
};

type SwiftUIButtonStyle =
  | "automatic"
  | "bordered"
  | "borderedProminent"
  | "borderless"
  | "glass"
  | "glassProminent"
  | "plain";

const NativeListContext = createContext<NativeListContextValue>({ native: true });

const ROW_INSETS = listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 });
const ROW_PADDING = { top: 0, bottom: 0, leading: 0, trailing: 0 } as const;
const TITLE_MODIFIERS = [font({ size: 17, weight: "regular" })];
const SUBTITLE_MODIFIERS = [font({ size: 13, weight: "regular" }), lineLimit(4)];
const VALUE_MODIFIERS = [font({ size: 17, weight: "regular" }), lineLimit(1)];

function toPlainText(value: ReactNode): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}

function useNativeListEnabled() {
  return useContext(NativeListContext).native;
}

function supportsNativeTextRow(...values: Array<ReactNode | undefined>) {
  return values.every((value) => value == null || toPlainText(value) != null);
}

function resolveNativeListBtnTintColor(
  btnTint: boolean | string | undefined,
  primaryColor: string,
) {
  if (btnTint === false) {
    return null;
  }

  return typeof btnTint === "string" ? btnTint : primaryColor;
}

function resolveNativeListTitleColor(
  titleColor: boolean | string | undefined,
  primaryColor: string,
) {
  if (titleColor === false) {
    return null;
  }

  return typeof titleColor === "string" ? titleColor : primaryColor;
}

function NativeRowLabel({
  subtitle,
  title,
  titleAlign,
  expand = false,
  titleColor,
  preserveLeadingAnchor = false,
}: {
  subtitle?: ReactNode;
  title?: ReactNode;
  titleAlign?: "center" | "right" | "left";
  expand?: boolean;
  titleColor?: boolean | string | null;
  preserveLeadingAnchor?: boolean;
}) {
  const theme = useTheme();
  const titleText = toPlainText(title);
  const subtitleText = toPlainText(subtitle);
  const primaryColor = toSwiftUIHexColor(theme.color.val) ?? theme.color.val;
  const secondaryColor = toSwiftUIHexColor(theme.color10.val) ?? theme.color10.val;
  const resolvedTextAlignment =
    titleAlign === "center" ? "center" : titleAlign === "right" ? "trailing" : "leading";
  const resolvedTitleColor = resolveNativeListTitleColor(titleColor ?? undefined, primaryColor);

  if ((title != null && titleText == null) || (subtitle != null && subtitleText == null)) {
    return null;
  }

  const labelContent = (
    <VStack
      alignment={resolvedTextAlignment}
      modifiers={[
        ...(expand ? [frame({ maxWidth: 99999, alignment: resolvedTextAlignment })] : []),
      ]}
      spacing={subtitleText != null ? 4 : 0}
    >
      {titleText != null ? (
        <SwiftText
          modifiers={[
            ...TITLE_MODIFIERS,
            ...(resolvedTitleColor != null ? [foregroundStyle(resolvedTitleColor)] : []),
            lineLimit(subtitleText != null ? 2 : 1),
            multilineTextAlignment(resolvedTextAlignment),
          ]}
        >
          {titleText}
        </SwiftText>
      ) : null}
      {subtitleText != null ? (
        <SwiftText modifiers={[...SUBTITLE_MODIFIERS, foregroundStyle(secondaryColor)]}>
          {subtitleText}
        </SwiftText>
      ) : null}
    </VStack>
  );

  if (preserveLeadingAnchor && resolvedTextAlignment === "center") {
    return (
      <ZStack
        alignment="center"
        modifiers={[layoutPriority(1), ...(expand ? [frame({ maxWidth: 99999 })] : [])]}
      >
        <VStack
          alignment="leading"
          modifiers={[
            opacity(0),
            ...(expand ? [frame({ maxWidth: 99999, alignment: "leading" })] : []),
          ]}
          spacing={subtitleText != null ? 4 : 0}
        >
          {titleText != null ? (
            <SwiftText modifiers={[...TITLE_MODIFIERS, lineLimit(subtitleText != null ? 2 : 1)]}>
              {titleText}
            </SwiftText>
          ) : null}
          {subtitleText != null ? (
            <SwiftText modifiers={[...SUBTITLE_MODIFIERS]}>{subtitleText}</SwiftText>
          ) : null}
        </VStack>
        {labelContent}
      </ZStack>
    );
  }

  return <VStack modifiers={[layoutPriority(1)]}>{labelContent}</VStack>;
}

function NativeRowContainer({
  children,
  disabled,
  onPress,
  btnStyle,
  btnTint,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  btnStyle?: SwiftUIButtonStyle;
  btnTint?: boolean | string;
}) {
  const theme = useTheme();
  const primaryColor = toSwiftUIHexColor(theme.color.val) ?? theme.color.val;
  const resolvedTint = resolveNativeListBtnTintColor(btnTint, primaryColor);
  const baseModifiers = [ROW_INSETS, padding(ROW_PADDING)];

  if (onPress != null) {
    return (
      <SwiftButton
        modifiers={[disabledModifier(disabled ?? false), buttonStyle(btnStyle ?? "automatic")]}
        onPress={onPress}
      >
        <HStack
          alignment="center"
          modifiers={[...baseModifiers, ...(resolvedTint != null ? [tint(resolvedTint)] : [])]}
          spacing={12}
        >
          {children}
        </HStack>
      </SwiftButton>
    );
  }

  return (
    <HStack
      alignment="center"
      modifiers={[...baseModifiers, disabledModifier(disabled ?? false)]}
      spacing={12}
    >
      {children}
    </HStack>
  );
}

function NativeHostedContent({ children }: { children: ReactNode }) {
  return (
    <RNHostView matchContents>
      <View style={styles.hostedContent}>{children}</View>
    </RNHostView>
  );
}

function NativeHostedTrailingControl({ children }: { children: ReactNode }) {
  return (
    <RNHostView matchContents>
      <View style={styles.trailingHostedContent}>{children}</View>
    </RNHostView>
  );
}

function NativeHostedCustomRow({ children }: { children: ReactNode }) {
  return (
    <RNHostView matchContents={{ vertical: true }}>
      <View style={styles.customRowShell}>{children}</View>
    </RNHostView>
  );
}

function NativePressRow({
  chevron = false,
  disabled,
  nativeHaptics,
  onPress,
  subtitle,
  title,
  titleAlign,
  trailingControl,
  value,
  btnStyle,
  btnTint,
  preserveLeadingAnchor = false,
}: NativeListItemBaseProps & {
  trailingControl?: ReactNode;
  btnStyle?: SwiftUIButtonStyle;
  preserveLeadingAnchor?: boolean;
}) {
  const theme = useTheme();
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);
  const secondaryColor = toSwiftUIHexColor(theme.color10.val) ?? theme.color10.val;
  const titleText = toPlainText(title);
  const subtitleText = toPlainText(subtitle);
  const valueText = toPlainText(value);
  const hasTrailingContent = valueText != null || trailingControl != null || chevron;
  const showTrailingSpacer = hasTrailingContent && (titleText != null || subtitleText != null);

  const handlePress = onPress
    ? () => {
        onPress();
        triggerNativeHaptics(resolvedHaptics);
      }
    : undefined;

  return (
    <NativeRowContainer
      disabled={disabled}
      onPress={handlePress}
      btnStyle={btnStyle}
      btnTint={btnTint}
    >
      <NativeRowLabel
        subtitle={subtitleText ?? undefined}
        title={titleText ?? undefined}
        titleAlign={titleAlign}
        expand={titleAlign != null}
        titleColor={btnTint}
        preserveLeadingAnchor={preserveLeadingAnchor}
      />
      {showTrailingSpacer ? <Spacer minLength={12} /> : null}
      {valueText != null ? (
        <SwiftText modifiers={[...VALUE_MODIFIERS, foregroundStyle(secondaryColor)]}>
          {valueText}
        </SwiftText>
      ) : null}
      {trailingControl}
      {chevron ? <Image color={secondaryColor} size={13} systemName="chevron.right" /> : null}
    </NativeRowContainer>
  );
}

function NativeListRoot({
  children,
  native = true,
  style,
  scrollable = true,
  ...fallbackProps
}: NativeListRootProps) {
  const insets = useSafeAreaInsets();
  const {
    active: insideTrueSheet,
    insetAdjustment,
    nativeScrollInsetsApplied,
  } = useTrueSheetScrollLayout();

  if (!native) {
    return (
      <NativeListContext.Provider value={{ native: false }}>
        <FallbackRoot {...fallbackProps} style={style} scrollable={scrollable}>
          {children}
        </FallbackRoot>
      </NativeListContext.Provider>
    );
  }

  const bottomPadding = insideTrueSheet
    ? getTrueSheetScrollBottomPadding({
        insetAdjustment,
        nativeScrollInsetsApplied,
        safeAreaBottom: insets.bottom,
      })
    : 0;
  return (
    <NativeListContext.Provider value={{ native: true }}>
      <Host style={[styles.nativeRoot, style]}>
        <List
          compensatesForViewportClipping={insideTrueSheet}
          modifiers={[
            listStyle("insetGrouped"),
            listSectionSpacing("compact"),
            scrollContentBackground("hidden"),
            ...(insideTrueSheet && bottomPadding > 0
              ? [
                  contentMargins({
                    edges: "bottom",
                    length: bottomPadding,
                    placement: "scrollContent",
                  }),
                ]
              : []),
            scrollDisabled(!scrollable),
          ]}
        >
          {children}
        </List>
      </Host>
    </NativeListContext.Provider>
  );
}

function NativeListSection({ children, footer, title }: NativeListSectionProps) {
  if (!useNativeListEnabled()) {
    return (
      <FallbackSection footer={footer} title={title}>
        {children}
      </FallbackSection>
    );
  }

  const stringTitle = toPlainText(title);
  const stringFooter = toPlainText(footer);
  const header =
    title != null && stringTitle == null ? (
      <NativeHostedContent>{title}</NativeHostedContent>
    ) : undefined;
  const footerView =
    footer != null && stringFooter == null ? (
      <NativeHostedContent>{footer}</NativeHostedContent>
    ) : undefined;

  return (
    <SwiftUISection
      footer={footerView ?? stringFooter ?? undefined}
      header={header}
      title={stringTitle ?? undefined}
    >
      {children}
    </SwiftUISection>
  );
}

export function NativeListActionItem(props: NativeListActionItemProps) {
  if (!useNativeListEnabled()) {
    return <FallbackActionItem {...props} />;
  }

  if (!supportsNativeTextRow(props.title, props.subtitle, props.value)) {
    return <FallbackActionItem {...props} />;
  }

  return <NativePressRow {...props} chevron={props.chevron} />;
}

export function NativeListNavigationItem(props: NativeListNavigationItemProps) {
  if (!useNativeListEnabled()) {
    return <FallbackNavigationItem {...props} />;
  }

  if (!supportsNativeTextRow(props.title, props.subtitle, props.value)) {
    return <FallbackNavigationItem {...props} />;
  }

  return <NativePressRow {...props} chevron={props.chevron ?? true} />;
}

export function NativeListButtonItem({
  title,
  onPress,
  disabled,
  titleAlign = "center",
  btnTint,
  ...itemProps
}: NativeListButtonItemProps) {
  // const theme = useTheme();
  // const defaultColor = theme.accent10.val;
  const defaultColor = false;
  let resolveColor = btnTint ?? defaultColor;
  if (typeof resolveColor === "string") {
    resolveColor = toSwiftUIHexColor(resolveColor) ?? false;
  }

  return (
    <NativeListItem
      {...itemProps}
      title={title}
      disabled={disabled}
      onPress={onPress}
      titleAlign={titleAlign}
      value={undefined}
      btnTint={resolveColor}
    />
  );
}

export function NativeListItem({
  title,
  onPress,
  disabled,
  titleAlign,
  btnTint,
  ...itemProps
}: NativeListItemProps) {
  if (!useNativeListEnabled() || !supportsNativeTextRow(itemProps.subtitle)) {
    return (
      <FallbackItem
        title={title}
        onPress={onPress}
        disabled={disabled}
        titleAlign={titleAlign}
        btnTint={btnTint}
        {...itemProps}
      />
    );
  }

  return (
    <NativePressRow
      {...itemProps}
      title={title}
      disabled={disabled}
      onPress={onPress}
      titleAlign={titleAlign}
      btnTint={btnTint}
      preserveLeadingAnchor={titleAlign === "center"}
    />
  );
}

export function NativeListSwitchItem({ switchProps, ...itemProps }: NativeListSwitchItemProps) {
  if (!useNativeListEnabled()) {
    return <FallbackSwitchItem switchProps={switchProps} {...itemProps} />;
  }

  if (!supportsNativeTextRow(itemProps.title, itemProps.subtitle)) {
    return <FallbackSwitchItem switchProps={switchProps} {...itemProps} />;
  }

  const checked = switchProps.checked ?? switchProps.defaultChecked ?? false;

  return (
    <NativePressRow
      {...itemProps}
      nativeHaptics={itemProps.nativeHaptics ?? true}
      disabled={itemProps.disabled || switchProps.disabled}
      onPress={() => {
        switchProps.onCheckedChange?.(!checked);
      }}
      trailingControl={
        <NativeHostedTrailingControl>
          <Switch {...switchProps} native />
        </NativeHostedTrailingControl>
      }
      value={undefined}
    />
  );
}

export function NativeListSelectItem({ selectProps, ...itemProps }: NativeListSelectItemProps) {
  if (!useNativeListEnabled()) {
    return <FallbackSelectItem selectProps={selectProps} {...itemProps} />;
  }

  if (!supportsNativeTextRow(itemProps.title, itemProps.subtitle)) {
    return <FallbackSelectItem selectProps={selectProps} {...itemProps} />;
  }

  const resolvedHaptics = useResolvedNativeHaptics(
    selectProps.nativeHaptics ?? itemProps.nativeHaptics ?? false,
  );
  const resolvedPickerMode = (selectProps.nativePickerMode ?? "dropdown") as "dropdown" | "wheel";
  const resolvedItemGroups = resolveSelectItemGroups({
    itemGroups: selectProps.itemGroups,
    items: selectProps.items,
    options: selectProps.options,
  });
  const selectItems = resolvedItemGroups.flatMap((group) => group.items);
  const selectedValue = selectProps.value ?? selectProps.defaultValue;
  const disabled = itemProps.disabled || selectProps.disabled || selectProps.isDisabled;
  const pickerRef = useRef<NativePickerSwiftUIHandle>(null);

  return (
    <NativePressRow
      {...itemProps}
      disabled={disabled}
      nativeHaptics={resolvedHaptics}
      onPress={() => {
        pickerRef.current?.open();
      }}
      btnStyle={resolvedPickerMode === "wheel" ? "plain" : undefined}
      trailingControl={
        <NativeHostedTrailingControl>
          <NativePickerSwiftUI
            ref={pickerRef}
            items={selectItems}
            mode={resolvedPickerMode}
            nativeTrigger
            nativeTriggerContainerStyle={[
              styles.selectInlineTrigger,
              disabled ? styles.disabledContent : null,
            ]}
            nativeTriggerIcon="chevrons-up-down"
            nativeTriggerLabelProps={{
              color: "$color10",
              fontSize: "$4",
              numberOfLines: 1,
            }}
            onValueChange={selectProps.onValueChange}
            placeholder={selectProps.placeholder}
            resolvedNativeHaptics={resolvedHaptics}
            value={selectedValue ?? null}
          />
        </NativeHostedTrailingControl>
      }
      value={undefined}
    />
  );
}

export function NativeListCustomItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: NativeListCustomItemProps) {
  if (!useNativeListEnabled()) {
    return (
      <FallbackCustomItem disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
        {children}
      </FallbackCustomItem>
    );
  }

  if (onPress == null) {
    return (
      <VStack modifiers={[ROW_INSETS, disabledModifier(disabled ?? false), padding(ROW_PADDING)]}>
        <NativeHostedCustomRow>{children}</NativeHostedCustomRow>
      </VStack>
    );
  }

  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);

  return (
    <SwiftButton
      modifiers={[disabledModifier(disabled ?? false), ROW_INSETS, padding(ROW_PADDING)]}
      onPress={() => {
        onPress();
        triggerNativeHaptics(resolvedHaptics);
      }}
    >
      <NativeHostedCustomRow>{children}</NativeHostedCustomRow>
    </SwiftButton>
  );
}

const styles = StyleSheet.create({
  customRowShell: {
    alignSelf: "stretch",
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
  },
  disabledContent: {
    opacity: 0.5,
  },
  hostedContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  nativeRoot: {
    flex: 1,
  },
  selectInlineTrigger: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    maxWidth: 180,
    minHeight: 32,
    minWidth: 0,
  },
  trailingHostedContent: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
});

export { NativeListRoot as NativeList, NativeListSection };
