import { expect, mock, test } from "bun:test";

import type { WorkspaceListItem } from "../src/api/commands/workspace/types";
import { groupItemsByDate } from "../src/api/common/utils/date_group_utils";
import { compareNames } from "../src/api/common/utils/name_sort_utils";

const preferences = new Map<string, unknown>();
mock.module("../src/api/common/platform", () => ({ isSystemLocaleCN: () => true }));
const { formatUnixSecondsRelativeDate } = await import("../src/api/common/utils/date_utils");
mock.module("rn-ui-kit", () => ({ Select: () => null, confirmNative: async () => null }));
mock.module("@/theme/accent_themes", () => ({
  defaultAccentThemeName: "ocean",
  normalizeAccentThemeName: () => "ocean",
}));
mock.module("@/api/common", () => ({
  compareNames,
  formatUnixSecondsRelativeDate,
  groupItemsByDate,
  isDesktop: () => true,
}));
mock.module("@/api/commands/store", () => ({
  store: {
    commonGetSync: (key: string) => preferences.get(key),
    commonSetSync: (key: string, value: unknown) => preferences.set(key, value),
    commonSave: async () => {},
  },
}));

const { getWorkspaceSortTimestamp, getWorkspaceSubtitle, sortWorkspaces } =
  await import("../src/components/workspaces/workspace_select/workspace_sort");
const { groupWorkspaces } =
  await import("../src/components/workspaces/workspace_select/workspace_group");
const { createDefaultUiPreferences, uiPreferences } =
  await import("../src/stores/ui/ui_preferences");

function item(displayName: string, modifiedAt: number | null): WorkspaceListItem {
  return {
    id: displayName,
    displayName,
    modifiedAt,
    createdAt: 10,
    lastOpenedAt: 20,
    availability: "unknown",
    storageKind: "managed",
    storage: { kind: "managed", providerId: "app-local", directoryName: displayName },
  };
}

test("修改时间排序支持两个方向，未知始终置底，同时间按名称稳定排序", () => {
  const items = [item("unknown", null), item("B", 30), item("old", 5), item("A", 30)];
  expect(sortWorkspaces(items, "modified-at-desc").map((value) => value.id)).toEqual([
    "A",
    "B",
    "old",
    "unknown",
  ]);
  expect(sortWorkspaces(items, "modified-at-asc").map((value) => value.id)).toEqual([
    "old",
    "A",
    "B",
    "unknown",
  ]);
  expect(items[0].id).toBe("unknown");
});

test("修改排序的副标题和日期分组均使用修改时间", () => {
  const today = Math.floor(Date.now() / 1000);
  const known = item("today", today);
  const unknown = item("unknown", null);
  expect(getWorkspaceSortTimestamp(known, "modified-at-desc")).toBe(today);
  expect(getWorkspaceSortTimestamp(known, "last-opened-desc")).toBe(20);
  expect(getWorkspaceSortTimestamp(known, "created-at-desc")).toBe(10);
  expect(getWorkspaceSubtitle(unknown, "modified-at-desc")).toBe("修改时间未知");
  expect(getWorkspaceSubtitle(known, "modified-at-desc")).toBe(
    formatUnixSecondsRelativeDate(today),
  );
  const sections = groupWorkspaces([known, unknown], "date", "modified-at-desc");
  expect(sections[0].workspaces[0].id).toBe("today");
  expect(sections[0].title).toBe("今天");
  expect(sections.at(-1)?.workspaces[0].id).toBe("unknown");
});

test("无偏好或非法偏好默认最近修改，保留已有选择，并持久化新选项", async () => {
  preferences.clear();
  expect(createDefaultUiPreferences().workspaceSelect.sortValue).toBe("modified-at-desc");
  expect(uiPreferences.getPreferences().workspaceSelect.sortValue).toBe("modified-at-desc");
  preferences.set("ui.workspaceSelect.sortValue", "invalid");
  expect(uiPreferences.getPreferences().workspaceSelect.sortValue).toBe("modified-at-desc");
  preferences.set("ui.workspaceSelect.sortValue", "last-opened-desc");
  expect(uiPreferences.getPreferences().workspaceSelect.sortValue).toBe("last-opened-desc");
  const next = createDefaultUiPreferences();
  next.workspaceSelect.sortValue = "modified-at-asc";
  await uiPreferences.savePreferences(next);
  expect(uiPreferences.getPreferences().workspaceSelect.sortValue).toBe("modified-at-asc");
});
