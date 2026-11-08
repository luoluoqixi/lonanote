import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { Button, Text } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system";
import { useLayoutMode } from "@/hooks/layout";
import type { LicenseScope } from "@/hooks/settings/license_text_data";
import { useLicenseText } from "@/hooks/settings/use_license_text";
import { useToast } from "@/hooks/ui";

import { licenseTextBlocks } from "../licenses_model";

export function LicensesSettingsPage() {
  const { layoutMode } = useLayoutMode();
  const isDesktop = layoutMode == "desktop";
  const [scope, setScope] = useState<LicenseScope>("direct");
  const { text, error, loading } = useLicenseText(scope);
  const { toast } = useToast();
  const blocks = useMemo(() => licenseTextBlocks(text), [text]);
  return (
    <View style={{ flex: 1, gap: 12, padding: 0 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 0 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 0 }}>
          <Button
            size={isDesktop ? "xs" : "sm"}
            variant={scope === "direct" ? "secondary" : "ghost"}
            onPress={() => setScope("direct")}
            accessibilityState={{ selected: scope === "direct" }}
          >
            开源许可
          </Button>
          <Button
            size={isDesktop ? "xs" : "sm"}
            variant={scope === "all" ? "secondary" : "ghost"}
            onPress={() => setScope("all")}
            accessibilityState={{ selected: scope === "all" }}
          >
            全部开源许可
          </Button>
        </View>
        <Button
          size={isDesktop ? "xs" : "sm"}
          variant="secondary"
          disabled={loading || !!error || !text}
          onPress={() => {
            void clipboard
              .writeText(text)
              .then(() => toast.info("已复制许可文本"))
              .catch(() => toast.error("复制失败"));
          }}
        >
          复制
        </Button>
      </View>
      <FlatList
        key={scope}
        data={blocks}
        keyExtractor={(block) => block.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <Text className="text-muted-foreground">
            {error ?? (loading ? "正在读取开源许可…" : "暂无许可文本")}
          </Text>
        }
        renderItem={({ item }) => (
          <Text selectable style={{ fontSize: 12, lineHeight: 20 }}>
            {item.text}
          </Text>
        )}
      />
    </View>
  );
}
