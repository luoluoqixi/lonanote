import { useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { Button, Input, Text } from "rn-ui-kit";

import type { FontConsumer, FontFamilyEntry, FontSelection } from "@/api/commands/fonts/types";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { useFontCapability, useFontDirectory } from "@/hooks/settings/use_font_directory";
import { useFontSettings } from "@/hooks/settings/use_font_settings";

import { filterFontFamilies } from "./font_picker_model";

function FontRow({
  entry,
  consumer,
  selected,
  disabled,
  onPress,
}: {
  entry: FontFamilyEntry;
  consumer: FontConsumer;
  selected: boolean;
  disabled: boolean;
  onPress(): void;
}) {
  const available = useFontCapability(entry, consumer);
  return (
    <Button
      variant="ghost"
      disabled={disabled || !available}
      accessibilityRole="button"
      accessibilityLabel={entry.displayName}
      accessibilityState={{ selected, disabled: disabled || !available }}
      onPress={onPress}
      style={{ paddingHorizontal: 12 }}
      className={selected ? "bg-accent/30" : undefined}
      buttonSize={{ height: 42 }}
    >
      <View
        style={{
          width: "100%",
          opacity: available === false ? 0.4 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>
          {entry.displayName}
        </Text>
        <Text className="text-muted-foreground" style={{ fontSize: 12 }}>
          {available === undefined
            ? "正在验证…"
            : available
              ? selected
                ? "已选择"
                : ""
              : "不可用"}
        </Text>
      </View>
    </Button>
  );
}

export function FontPicker({
  consumer,
  open,
  onOpenChange,
}: {
  consumer: FontConsumer;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const fonts = useFontSettings();
  const directory = useFontDirectory(open);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    if (open) {
      setQuery("");
      setError(null);
    }
    return () => {
      generation.current++;
    };
  }, [open]);
  async function select(selection: FontSelection) {
    const request = generation.current;
    setSaving(true);
    setError(null);
    try {
      await fonts.select(consumer, selection);
      if (request === generation.current) onOpenChange(false);
    } catch (reason) {
      if (request === generation.current)
        setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }
  const entries = filterFontFamilies(directory.entries, consumer, query);
  return (
    <AdaptiveModal
      name={`font-picker-${consumer}`}
      open={open}
      onOpenChange={onOpenChange}
      title={consumer === "ui" ? "UI 界面字体" : "编辑器字体"}
      dialogSize={{ width: 480, height: 520 }}
    >
      <View style={{ flex: 1, gap: 10, padding: 8 }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="搜索本机字体"
          accessibilityLabel="搜索本机字体"
          size="sm"
        />
        <Button
          variant="outline"
          disabled={saving}
          onPress={() => {
            void select(null);
          }}
        >
          系统默认{fonts[consumer].selection === null ? " ✓" : ""}
        </Button>
        {fonts[consumer].unavailable ? (
          <Text className="text-muted-foreground" style={{ fontSize: 12 }}>
            当前字体不可用，已使用系统默认
          </Text>
        ) : null}
        {error ? (
          <Text className="text-destructive" style={{ fontSize: 12 }}>
            {error}
          </Text>
        ) : null}
        {directory.error ? (
          <>
            <Text className="text-destructive">读取本机字体失败</Text>
            <Button onPress={directory.retry}>重试</Button>
          </>
        ) : null}
        <FlatList
          data={entries}
          keyExtractor={(entry) => `${entry.platform}:${entry.familyKey}`}
          style={{ flex: 1 }}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={3}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="text-muted-foreground">
              {directory.loading ? "正在读取本机字体…" : "没有匹配的字体"}
            </Text>
          }
          renderItem={({ item }) => (
            <FontRow
              entry={item}
              consumer={consumer}
              selected={fonts[consumer].selection?.familyKey === item.familyKey}
              disabled={saving}
              onPress={() => {
                void select(item);
              }}
            />
          )}
        />
      </View>
    </AdaptiveModal>
  );
}
