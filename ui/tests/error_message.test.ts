import { expect, test } from "bun:test";

import { getErrorMessage } from "../src/api/common/error_message";

test("保留 Rust 错误字符串、Error 和结构化错误的具体原因", () => {
  expect(getErrorMessage("权限不足：D:\\笔记", "失败")).toBe("权限不足：D:\\笔记");
  expect(getErrorMessage(new Error("目录不存在"), "失败")).toBe("目录不存在");
  expect(getErrorMessage({ message: "Provider 不支持", code: 7 }, "失败")).toBe("Provider 不支持");
  expect(getErrorMessage({ code: "EACCES", path: "D:/notes" }, "失败")).toContain("EACCES");
});

test("没有有效错误信息时使用默认文案", () => {
  expect(getErrorMessage(null, "未知错误")).toBe("未知错误");
  expect(getErrorMessage(undefined, "未知错误")).toBe("未知错误");
  expect(getErrorMessage(" ", "未知错误")).toBe("未知错误");
  expect(getErrorMessage({}, "未知错误")).toBe("未知错误");
});
