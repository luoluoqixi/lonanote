/** 鼠标与触控共用双击识别；匹配后清空，避免三连击创建两篇笔记。 */
export function createEditorTabBlankPressDetector() {
  let previous: { time: number; x: number; y: number } | null = null;
  return (time: number, x: number, y: number): boolean => {
    if (
      previous &&
      time >= previous.time &&
      time - previous.time <= 400 &&
      Math.hypot(x - previous.x, y - previous.y) <= 8
    ) {
      previous = null;
      return true;
    }
    previous = { time, x, y };
    return false;
  };
}
