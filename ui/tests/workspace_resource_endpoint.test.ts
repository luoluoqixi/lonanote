import { expect, test } from "bun:test";

import { createWorkspaceResourceEndpoint } from "../src/api/common/workspace_resource_endpoint";

const SCOPE = {
  scopeId: "83f8b9b6-b57d-4b06-becd-545309321211",
  generation: 7,
};

test("Windows 使用 WebView2 可拦截的 Workspace resource endpoint", () => {
  expect(createWorkspaceResourceEndpoint(SCOPE, "windows")).toBe(
    "http://lonanote-resource.localhost/resource/83f8b9b6-b57d-4b06-becd-545309321211/7",
  );
});

test("macOS 与移动端继续使用原生 Workspace resource scheme", () => {
  const expected =
    "lonanote-resource://resource/83f8b9b6-b57d-4b06-becd-545309321211/7";

  expect(createWorkspaceResourceEndpoint(SCOPE, "macos")).toBe(expected);
  expect(createWorkspaceResourceEndpoint(SCOPE, "ios")).toBe(expected);
  expect(createWorkspaceResourceEndpoint(SCOPE, "android")).toBe(expected);
});
