import { expect, test } from "bun:test";

import {
  assertWindowCanOpen,
  holdWindowCloseBarrier,
  releaseWindowCloseBarrier,
} from "../src/api/common/window_close_preparation";
import { routeWindowCloseMessage } from "../src/api/common/window_close_routing";

test("关闭新窗口时主窗口不进入屏障，即使消息被错误广播", async () => {
  let prepared = false;
  const deliver = (stage: "barrier" | "prepare") =>
    routeWindowCloseMessage(
      "main",
      {
        windowLabel: "workspace-window-b",
        requestId: "close-b",
        stage,
      },
      async ({ requestId, stage }) => {
        if (stage === "barrier") holdWindowCloseBarrier(requestId);
        if (stage === "prepare") prepared = true;
      },
    );
  try {
    await deliver("barrier");
    await deliver("prepare");
    expect(prepared).toBe(false);
    expect(() => assertWindowCanOpen()).not.toThrow();
  } finally {
    releaseWindowCloseBarrier("close-b");
  }
});

test("本窗口关闭及取消仍按同一 requestId 释放屏障", async () => {
  const handle = async ({ requestId, stage }: { requestId: string; stage: string }) => {
    if (stage === "barrier") holdWindowCloseBarrier(requestId);
    if (stage === "abort") releaseWindowCloseBarrier(requestId);
  };
  const message = { windowLabel: "main", requestId: "close-a", stage: "barrier" as const };
  await routeWindowCloseMessage("main", message, handle);
  expect(() => assertWindowCanOpen()).toThrow();
  await routeWindowCloseMessage("main", { ...message, stage: "abort" }, handle);
  expect(() => assertWindowCanOpen()).not.toThrow();
});
