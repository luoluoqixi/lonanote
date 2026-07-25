import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Dialog, Tabs } from "rn-ui-kit";

import { isWeb } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { type SettingsPageId, getSettingsPage, settingsPages } from "../settings_config";

type DesktopSettingsDialogProps = {
  initialPageId?: SettingsPageId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const DIALOG_WIDTH = isWeb() ? "80%" : "90%";
const DIALOG_HEIGHT = isWeb() ? "80%" : "82%";

export function DesktopSettingsDialog({
  initialPageId = "global",
  isOpen,
  onOpenChange,
}: DesktopSettingsDialogProps) {
  const { isLoaded, preferences } = useUiPreferences();
  const desktopPages = useMemo(
    () =>
      settingsPages.filter(
        (page) =>
          page.desktopTab &&
          (!page.requiresDeveloperOptions || preferences.developer.optionsEnabled),
      ),
    [preferences.developer.optionsEnabled],
  );
  const [selectedPageId, setSelectedPageId] = useState<SettingsPageId>(initialPageId);

  useEffect(() => {
    if (getSettingsPage(initialPageId)?.desktopTab) {
      setSelectedPageId(initialPageId);
    }
  }, [initialPageId]);

  useEffect(() => {
    if (isLoaded && selectedPageId === "developer" && !preferences.developer.optionsEnabled) {
      setSelectedPageId("global");
    }
  }, [isLoaded, preferences.developer.optionsEnabled, selectedPageId]);

  return (
    <Dialog
      height={DIALOG_HEIGHT}
      minHeight={0}
      onOpenChange={onOpenChange}
      open={isOpen}
      title="设置"
      width={DIALOG_WIDTH}
    >
      <View style={styles.root}>
        <Tabs
          aria-label="设置页面导航"
          contentProps={{ style: styles.content }}
          items={desktopPages.map((page) => {
            const PageComponent = page.Component;
            return {
              content: (
                <View style={styles.page}>
                  <PageComponent />
                </View>
              ),
              label: page.title,
              value: page.id,
            };
          })}
          listProps={{ style: styles.list }}
          onValueChange={(nextValue) => setSelectedPageId(nextValue as SettingsPageId)}
          orientation="vertical"
          style={styles.tabs}
          value={selectedPageId}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 4,
    width: 140,
  },
  page: {
    flex: 1,
    minHeight: 0,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
});
