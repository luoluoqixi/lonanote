import { expect, test } from "bun:test";

import { completeEditorWindowTransfer } from "../src/components/editor/controllers/editor_window_transfer";

test("目标ready与checkpoint之前保留源标签，copy不移除源", async () => {
  let ready!: () => void;
  const promise = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const steps: string[] = [];
  const task = completeEditorWindowTransfer("move", {
    ready: promise,
    checkpoint: async () => {
      steps.push("checkpoint");
    },
    removeSource: () => {
      steps.push("removed");
    },
  });
  await Promise.resolve();
  expect(steps).toEqual([]);
  ready();
  await task;
  expect(steps).toEqual(["checkpoint", "removed"]);
  await completeEditorWindowTransfer("copy", {
    ready: Promise.resolve(),
    checkpoint: async () => {},
    removeSource: () => {
      throw Error("copy removed source");
    },
  });
});
test("ready或checkpoint失败不移除源", async () => {
  let removed = false;
  await expect(
    completeEditorWindowTransfer("move", {
      ready: Promise.resolve(),
      checkpoint: async () => {
        throw Error("failed");
      },
      removeSource: () => {
        removed = true;
      },
    }),
  ).rejects.toThrow("failed");
  expect(removed).toBe(false);
});
