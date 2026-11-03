import { expect, test } from "bun:test";

import { isCurrentWorkspaceLocation } from "../src/components/workspaces/workspace_select/workspace_location_target";

const storage = { kind: "managed" as const, providerId: "app-local", directoryName: "notes" };
const managed = {
  providerId: "app-local",
  isManaged: true,
  directoryName: "notes",
  externalBinding: null,
};
const external = (path: string, providerId = "desktop-folder") => ({
  providerId,
  isManaged: false,
  directoryName: "",
  externalBinding: {
    kind: "external" as const,
    providerId,
    providerSchemaVersion: 1,
    resourceRef: path,
  },
});

test("受管理位置未变化时拦截，包括提交时会去除的空格", () => {
  expect(isCurrentWorkspaceLocation(storage, null, managed)).toBe(true);
  expect(isCurrentWorkspaceLocation(storage, null, { ...managed, directoryName: " notes " })).toBe(
    true,
  );
  expect(isCurrentWorkspaceLocation(storage, null, { ...managed, directoryName: "other" })).toBe(
    false,
  );
  expect(isCurrentWorkspaceLocation(storage, null, { ...managed, providerId: "other" })).toBe(
    false,
  );
});

test("选择当前本地路径时拦截，切换 Provider 也不例外", () => {
  expect(isCurrentWorkspaceLocation(storage, "/data/notes", external("/data/notes"))).toBe(true);
  expect(isCurrentWorkspaceLocation(storage, "C:\\notes", external("C:/notes"))).toBe(true);
  expect(isCurrentWorkspaceLocation(storage, "/data/notes", external("/data/other"))).toBe(false);
});

test("读取当前位置失败和未知 Provider 引用不应阻止重新定位", () => {
  expect(isCurrentWorkspaceLocation(storage, null, external("/data/notes"))).toBe(false);
  expect(
    isCurrentWorkspaceLocation(storage, "/data/notes", external("/data/notes", "opaque")),
  ).toBe(false);
  expect(isCurrentWorkspaceLocation(storage, null, { ...managed, isManaged: false })).toBe(false);
});
