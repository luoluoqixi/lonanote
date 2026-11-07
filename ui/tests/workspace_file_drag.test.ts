import { expect, test } from "bun:test";

import { WorkspaceFileDragTickets } from "../src/components/editor/controllers/workspace_file_drag";

test("文件拖放凭据仅接受来源工作区，一次消费并拒绝过期拖放", () => {
  let now = 0;
  const tickets = new WorkspaceFileDragTickets(() => now);
  const token = tickets.begin("workspace", ["a.md", "a.md", "dir/b.md"]);
  expect(() => tickets.take(token, "other")).toThrow();
  expect(tickets.take(token, "workspace")).toEqual(["a.md", "dir/b.md"]);
  expect(() => tickets.take(token, "workspace")).toThrow();
  const expired = tickets.begin("workspace", ["a.md"]);
  now = 60001;
  expect(() => tickets.take(expired, "workspace")).toThrow();
});
