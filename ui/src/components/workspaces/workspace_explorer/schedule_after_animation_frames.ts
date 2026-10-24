type AnimationFrameCallback = (timestamp: number) => void;
type ScheduleAnimationFrame = (callback: AnimationFrameCallback) => number;
type CancelAnimationFrame = (handle: number) => void;

export function scheduleAfterAnimationFrames(
  callback: () => void,
  frameCount: number,
  scheduleFrame: ScheduleAnimationFrame = requestAnimationFrame,
  cancelFrame: CancelAnimationFrame = cancelAnimationFrame,
) {
  let cancelled = false;
  let remainingFrames = frameCount;
  let frameHandle = 0;

  const handleFrame: AnimationFrameCallback = () => {
    if (cancelled) {
      return;
    }
    remainingFrames -= 1;
    if (remainingFrames <= 0) {
      callback();
      return;
    }
    frameHandle = scheduleFrame(handleFrame);
  };

  frameHandle = scheduleFrame(handleFrame);

  return () => {
    cancelled = true;
    cancelFrame(frameHandle);
  };
}
