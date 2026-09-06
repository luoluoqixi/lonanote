import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isEditorResourceActivatedPayload } from "../bridge/protocol";
import { parseEditorResourceReference, resolveEditorResourceReference } from "./resource_reference";
import { appendWorkspaceResourceUrl, resolveEditorResourceUrl } from "./resource_url";

const resourceContext = {
  available: true as const,
  scopeId: "3fdb84ea-85c9-4f22-96e6-97c4f773a30f",
  endpoint: "lonanote-resource://resource/3fdb84ea-85c9-4f22-96e6-97c4f773a30f/7",
  generation: 7,
  documentPath: "notes/daily/2026.md",
};

describe("Editor resource reference", () => {
  test("解析 document-relative 与 workspace-root-relative 路径", () => {
    assert.deepEqual(
      resolveEditorResourceReference(
        parseEditorResourceReference("image.png"),
        resourceContext.documentPath,
      ),
      { kind: "workspaceFile", path: "notes/daily/image.png", query: null, fragment: null },
    );
    assert.deepEqual(
      resolveEditorResourceReference(
        parseEditorResourceReference("../../assets/image.png"),
        resourceContext.documentPath,
      ),
      { kind: "workspaceFile", path: "assets/image.png", query: null, fragment: null },
    );
    assert.deepEqual(
      resolveEditorResourceReference(
        parseEditorResourceReference("/assets/image.png"),
        resourceContext.documentPath,
      ),
      { kind: "workspaceFile", path: "assets/image.png", query: null, fragment: null },
    );
  });

  test("先切分 query 和 fragment，再 canonicalize 路径", () => {
    const parsed = parseEditorResourceReference("../images/a b.png?size=full#preview");
    assert.deepEqual(parsed, {
      kind: "documentRelative",
      rawPath: "../images/a b.png",
      query: "size=full",
      fragment: "preview",
    });
    assert.deepEqual(resolveEditorResourceReference(parsed, resourceContext.documentPath), {
      kind: "workspaceFile",
      path: "notes/images/a b.png",
      query: "size=full",
      fragment: "preview",
    });
  });

  test("拒绝越过 workspace root 和危险路径语义", () => {
    for (const raw of [
      "../../../secret.png",
      "assets//image.png",
      "assets\\image.png",
      "assets%2Fimage.png",
      "assets%5cimage.png",
      "assets%252Fimage.png",
      "file:///private/image.png",
      "C:/Users/me/image.png",
      "custom://resource/image.png",
    ]) {
      const parsed = parseEditorResourceReference(raw);
      const resolved = resolveEditorResourceReference(parsed, resourceContext.documentPath);
      assert.equal(resolved.kind, "unsupported");
    }
  });

  test("保留允许的外部和 anchor 引用，但不把 blob 当成通用入口", () => {
    assert.deepEqual(parseEditorResourceReference("#overview"), {
      kind: "anchor",
      fragment: "overview",
    });
    assert.deepEqual(parseEditorResourceReference("https://example.com/image.png"), {
      kind: "external",
      url: "https://example.com/image.png",
    });
    assert.equal(parseEditorResourceReference("data:image/png;base64,AA==").kind, "external");
    assert.equal(
      parseEditorResourceReference("blob:https://example.com/object").kind,
      "unsupported",
    );
    assert.deepEqual(
      parseEditorResourceReference("blob:https://example.com/object", {
        isSurfaceBlobUrl: (url) => url === "blob:https://example.com/object",
      }),
      { kind: "external", url: "blob:https://example.com/object" },
    );
  });
});

describe("Editor resource URL", () => {
  test("以 canonical path 逐 segment 编码后附加 opaque endpoint", () => {
    assert.equal(
      appendWorkspaceResourceUrl(resourceContext.endpoint, "assets/a b#c.png"),
      "lonanote-resource://resource/3fdb84ea-85c9-4f22-96e6-97c4f773a30f/7/assets/a%20b%23c.png",
    );
    assert.equal(
      resolveEditorResourceUrl("../../assets/a b.png?size=full#preview", resourceContext),
      "lonanote-resource://resource/3fdb84ea-85c9-4f22-96e6-97c4f773a30f/7/assets/a%20b.png?size=full#preview",
    );
  });

  test("未取得 scope 时不为 workspace 文件制造 URL", () => {
    assert.equal(
      resolveEditorResourceUrl("image.png", {
        available: false,
        reason: "providerUnavailable",
      }),
      null,
    );
    assert.equal(
      resolveEditorResourceUrl("https://example.com/image.png", {
        available: false,
        reason: "providerUnavailable",
      }),
      "https://example.com/image.png",
    );
  });
});

describe("Resource activation bridge payload", () => {
  test("只接受已分类的语义化引用", () => {
    assert.equal(
      isEditorResourceActivatedPayload({
        rawReference: "../design.md#overview",
        resolved: { kind: "workspaceFile", path: "notes/design.md", fragment: "overview" },
        modifiers: { newView: true },
      }),
      true,
    );
    assert.equal(
      isEditorResourceActivatedPayload({
        rawReference: "../design.md",
        resolved: { kind: "workspaceFile", path: "" },
        modifiers: { newView: false },
      }),
      false,
    );
  });
});
