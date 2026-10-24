import { expect, test } from "bun:test";

import { scheduleAfterAnimationFrames } from "../src/components/workspaces/workspace_explorer/schedule_after_animation_frames";

type FrameCallback = (timestamp: number) => void;

function createFrameScheduler() {
  const callbacks = new Map<number, FrameCallback>();
  let nextHandle = 1;

  return {
    cancel: (handle: number) => callbacks.delete(handle),
    flushNext: () => {
      const next = callbacks.entries().next().value as [number, FrameCallback] | undefined;
      if (!next) {
        return;
      }
      callbacks.delete(next[0]);
      next[1](0);
    },
    schedule: (callback: FrameCallback) => {
      const handle = nextHandle++;
      callbacks.set(handle, callback);
      return handle;
    },
  };
}

test("等待两个 animation frame 后才执行回调", () => {
  const scheduler = createFrameScheduler();
  let callCount = 0;

  scheduleAfterAnimationFrames(
    () => {
      callCount += 1;
    },
    2,
    scheduler.schedule,
    scheduler.cancel,
  );

  expect(callCount).toBe(0);
  scheduler.flushNext();
  expect(callCount).toBe(0);
  scheduler.flushNext();
  expect(callCount).toBe(1);
});

test("取消后不再执行等待中的回调", () => {
  const scheduler = createFrameScheduler();
  let callCount = 0;
  const cancel = scheduleAfterAnimationFrames(
    () => {
      callCount += 1;
    },
    2,
    scheduler.schedule,
    scheduler.cancel,
  );

  scheduler.flushNext();
  cancel();
  scheduler.flushNext();

  expect(callCount).toBe(0);
});
