import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getScrollbarMetrics, scrollTopFromThumb } from "./desktop_scrollbar_geometry";

describe("桌面滚动条几何", () => {
  test("正文比例与滚动位置同步，拖动可以往返定位", () => {
    const metrics = getScrollbarMetrics(1000, 5000, 2000)!;
    assert.equal(metrics.thumbHeight, 200);
    assert.equal(metrics.thumbTop, 400);
    assert.equal(scrollTopFromThumb(400, metrics), 2000);
  });
  test("长文档保留可拖动的最小高度，并能到达末尾", () => {
    const metrics = getScrollbarMetrics(100, 10000, 9900)!;
    assert.equal(metrics.thumbHeight, 24);
    assert.equal(metrics.thumbTop, 76);
    assert.equal(scrollTopFromThumb(76, metrics), 9900);
  });
  test("无溢出或隐藏 iframe 没有可用轨道", () => {
    assert.equal(getScrollbarMetrics(500, 500, 0), null);
    assert.equal(getScrollbarMetrics(0, 5000, 100), null);
  });
  test("弹性滚动和越界拖动保持在有效范围", () => {
    const start = getScrollbarMetrics(100, 1000, -50)!;
    const end = getScrollbarMetrics(100, 1000, 1100)!;
    assert.equal(start.thumbTop, 0);
    assert.equal(end.thumbTop, 76);
    assert.equal(scrollTopFromThumb(-100, start), 0);
    assert.equal(scrollTopFromThumb(200, end), 900);
  });
});
