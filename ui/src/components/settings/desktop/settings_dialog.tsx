import { type ReactNode, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Dialog, Tabs } from "rn-ui-kit";

import { isWeb } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { type SettingsPageId, getSettingsPage, settingsPages } from "../settings_config";

type DesktopSettingsDialogProps = {
  initialPageId?: SettingsPageId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger?: ReactNode;
};

const DIALOG_WIDTH = isWeb() ? "80%" : "90%";
const DIALOG_HEIGHT = isWeb() ? "80%" : "82%";

export function DesktopSettingsDialog({
  initialPageId = "global",
  isOpen,
  onOpenChange,
  trigger,
}: DesktopSettingsDialogProps) {
  const { preferences } = useUiPreferences();
  const [selectedPageId, setSelectedPageId] = useState<SettingsPageId>(initialPageId);
  const desktopPages = useMemo(
    () =>
      settingsPages.filter(
        (page) =>
          page.desktopTab &&
          (!page.requiresDeveloperOptions ||
            preferences.developer.optionsEnabled ||
            page.id === selectedPageId),
      ),
    [preferences.developer.optionsEnabled, selectedPageId],
  );

  useEffect(() => {
    if (getSettingsPage(initialPageId)) {
      setSelectedPageId(initialPageId);
    }
  }, [initialPageId]);

  useEffect(() => {
    if (
      !preferences.developer.optionsEnabled &&
      getSettingsPage(selectedPageId)?.requiresDeveloperOptions
    ) {
      setSelectedPageId("global");
    }
  }, [preferences.developer.optionsEnabled, selectedPageId]);

  const selectedPageConfig = getSettingsPage(selectedPageId);
  const selectedPage =
    selectedPageConfig &&
    (!selectedPageConfig.requiresDeveloperOptions || preferences.developer.optionsEnabled)
      ? selectedPageConfig
      : desktopPages[0];
  const selectedTabId = selectedPage?.desktopTab
    ? selectedPage.id
    : (selectedPage?.parentId ?? desktopPages[0]?.id ?? "global");
  const SelectedPageComponent = selectedPage?.Component;

  return (
    <Dialog
      height={DIALOG_HEIGHT}
      minHeight={0}
      onOpenChange={onOpenChange}
      open={isOpen}
      title="设置"
      trigger={trigger}
      width={DIALOG_WIDTH}
    >
      <View style={styles.root}>
        <Tabs
          aria-label="设置页面导航"
          onValueChange={(nextValue) => setSelectedPageId(nextValue as SettingsPageId)}
          orientation="vertical"
          style={styles.tabs}
          value={selectedTabId}
        >
          <Tabs.List aria-label="设置页面导航" style={styles.list}>
            {desktopPages.map((page) => (
              <Tabs.Tab key={page.id} value={page.id}>
                {page.title}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <View style={styles.content}>
            {SelectedPageComponent ? <SelectedPageComponent /> : null}
          </View>
        </Tabs>
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
