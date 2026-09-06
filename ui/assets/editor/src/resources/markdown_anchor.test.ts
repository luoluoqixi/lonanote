import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { findMarkdownAnchorLine } from "./markdown_anchor";

describe("Markdown anchor", () => {
  test("按 GitHub 风格 slug 定位标题并解码 fragment", () => {
    const document = "# 开始\n\n## Hello, World!\n\n正文";

    assert.equal(findMarkdownAnchorLine(document, "%E5%BC%80%E5%A7%8B"), 1);
    assert.equal(findMarkdownAnchorLine(document, "hello-world"), 3);
  });

  test("按出现顺序区分重复标题", () => {
    const document = "## 章节\n\n内容\n\n## 章节\n\n更多内容";

    assert.equal(findMarkdownAnchorLine(document, "章节"), 1);
    assert.equal(findMarkdownAnchorLine(document, "章节-1"), 5);
  });

  test("拒绝无效编码和不存在的 heading", () => {
    assert.equal(findMarkdownAnchorLine("# 标题", "%E0%A4%A"), null);
    assert.equal(findMarkdownAnchorLine("# 标题", "不存在"), null);
  });
});
