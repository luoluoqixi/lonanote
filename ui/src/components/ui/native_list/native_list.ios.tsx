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
} from "@expo/ui/swift-ui";
import {
  disabled as disabledModifier,
  font,
  foregroundStyle,
  layoutPriority,
  lineLimit,
  listRowInsets,
  listSectionSpacing,
  listStyle,
  padding,
  scrollContentBackground,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { type ReactNode, createContext, useContext, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "tamagui";

import { NativePickerSwiftUI } from "../select/native_picker";
import type { NativePickerSwiftUIHandle } from "../select/native_picker";
import { resolveSelectItemGroups } from "../select/select_grouping";
import { Switch } from "../switch";
import { toSwiftUIHexColor, triggerNativeHaptics, useResolvedNativeHaptics } from "../utils";
import {
  NativeListActionItem as FallbackActionItem,
  NativeListItem as FallbackItem,
  NativeListNavigationItem as FallbackNavigationItem,
  NativeListRoot as FallbackRoot,
  NativeListSection as FallbackSection,
  NativeListSelectItem as FallbackSelectItem,
  NativeListSwitchItem as FallbackSwitchItem,
} from "./native_list_fallback";
import type {
  NativeListActionItemProps,
  NativeListItemBaseProps,
  NativeListNavigationItemProps,
  NativeListRootProps,
  NativeListSectionProps,
  NativeListSelectItemProps,
  NativeListSwitchItemProps,
} from "./types";

type NativeListContextValue = {
  native: boolean;
};

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

function NativeRowLabel({ subtitle, title }: { subtitle?: ReactNode; title?: ReactNode }) {
  const theme = useTheme();
  const titleText = toPlainText(title);
  const subtitleText = toPlainText(subtitle);
  const primaryColor = toSwiftUIHexColor(theme.color.val) ?? theme.color.val;
  const secondaryColor = toSwiftUIHexColor(theme.color10.val) ?? theme.color10.val;

  if ((title != null && titleText == null) || (subtitle != null && subtitleText == null)) {
    return null;
  }

  return (
    <VStack
      alignment="leading"
      modifiers={[layoutPriority(1)]}
      spacing={subtitleText != null ? 4 : 0}
    >
      {titleText != null ? (
        <SwiftText
          modifiers={[
            ...TITLE_MODIFIERS,
            foregroundStyle(primaryColor),
            lineLimit(subtitleText != null ? 2 : 1),
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
}

function NativeRowContainer({
  children,
  disabled,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const primaryColor = toSwiftUIHexColor(theme.color.val) ?? theme.color.val;
  const baseModifiers = [ROW_INSETS, padding(ROW_PADDING)];

  if (onPress != null) {
    return (
      <SwiftButton modifiers={[disabledModifier(disabled ?? false)]} onPress={onPress}>
        <HStack alignment="center" modifiers={[...baseModifiers, tint(primaryColor)]} spacing={12}>
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
    <RNHostView>
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
  trailingControl,
  value,
}: NativeListItemBaseProps & {
  trailingControl?: ReactNode;
}) {
  const theme = useTheme();
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);
  const secondaryColor = toSwiftUIHexColor(theme.color10.val) ?? theme.color10.val;
  const titleText = toPlainText(title);
  const subtitleText = toPlainText(subtitle);
  const valueText = toPlainText(value);

  const handlePress = onPress
    ? () => {
        onPress();
        triggerNativeHaptics(resolvedHaptics);
      }
    : undefined;

  return (
    <NativeRowContainer disabled={disabled} onPress={handlePress}>
      <NativeRowLabel subtitle={subtitleText ?? undefined} title={titleText ?? undefined} />
      <Spacer minLength={12} />
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

function NativeListRoot({ children, native = true, style, ...fallbackProps }: NativeListRootProps) {
  if (!native) {
    return (
      <NativeListContext.Provider value={{ native: false }}>
        <FallbackRoot {...fallbackProps} style={style}>
          {children}
        </FallbackRoot>
      </NativeListContext.Provider>
    );
  }

  return (
    <NativeListContext.Provider value={{ native: true }}>
      <Host style={[styles.nativeRoot, style]}>
        <List
          modifiers={[
            listStyle("insetGrouped"),
            listSectionSpacing("compact"),
            scrollContentBackground("hidden"),
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

export function NativeListItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: {
  children?: ReactNode;
  disabled?: boolean;
  nativeHaptics?: NativeListItemBaseProps["nativeHaptics"];
  onPress?: () => void;
}) {
  if (!useNativeListEnabled()) {
    return (
      <FallbackItem disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
        {children}
      </FallbackItem>
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
