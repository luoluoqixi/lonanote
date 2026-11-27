import { expect, mock, test } from "bun:test";

mock.module("../src/api/common/platform", () => ({ isTauri: () => true }));
mock.module("../src/stores/workspace", () => ({
  workspaceSessionStore: { getCurrentWorkspaceId: () => null },
}));
mock.module("../src/api/commands/workspace", () => ({ workspace: {}, workspaceFile: {} }));
let chosen = "/notes/existing.md";
mock.module("../src/api/commands/fs", () => ({
  fs: { showSelectDialog: async () => ({ path: chosen, overwriteConfirmed: true }) },
}));
const commits: unknown[] = [];
let confirms = 0;
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (cmd: string, args: unknown) => {
    if (cmd === "prepare_document_save_target")
      return { token: "t", reference: { kind: "looseFile", absolutePath: chosen }, exists: true };
    if (cmd === "commit_document_save_target") commits.push(args);
  },
}));
mock.module("rn-ui-kit", () => ({
  confirmNative: async () => {
    confirms++;
    return "overwrite";
  },
}));
const { chooseUntitledSaveTarget } =
  await import("../src/components/editor/controllers/untitled_save_target");

test("同一目标只在系统框确认；扩展名改变目标则保留应用确认", async () => {
  const document = { documentId: "untitled", identityRevision: 0, title: "无标题" } as any;
  const target = await chooseUntitledSaveTarget(document);
  expect(confirms).toBe(0);
  await target!.commit("draft");
  expect(commits[0]).toMatchObject({ token: "t", text: "draft", overwrite: true });
  chosen = "/notes/existing";
  await chooseUntitledSaveTarget(document);
  expect(confirms).toBe(1);
});
