import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../assets/editor/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/editor/src/styles.css", import.meta.url), "utf8");

function loadBeforeBridge(canvas: string, text: string, colorScheme: "light" | "dark") {
  const window = new Window();
  window.document.write(html);
  const frame = window.document.createElement("iframe");
  Object.assign(frame.style, { backgroundColor: canvas, color: text, colorScheme });
  Object.defineProperty(window, "frameElement", { value: frame });
  // 只运行 HTML 头部同步脚本，模拟模块下载和 bridge 握手尚未完成的阶段。
  const bootstrap = window.document.querySelector("head script:not([type])");
  expect(bootstrap).not.toBeNull();
  runInNewContext(bootstrap!.textContent, { window, document: window.document });
  const style = window.document.createElement("style");
  style.textContent = css;
  window.document.head.append(style);
  return window;
}

test("bridge 就绪前，内部文档的首帧背景和文字继承深色宿主，后加载的浅色默认 CSS 不覆盖它", () => {
  const window = loadBeforeBridge("#1c1c1c", "#eeeeee", "dark");
  for (const element of [
    window.document.documentElement,
    window.document.body,
    window.document.getElementById("editor")!,
  ]) {
    expect(window.getComputedStyle(element).backgroundColor).toBe("#1c1c1c");
    expect(window.getComputedStyle(element).color).toBe("#eeeeee");
  }
  expect(window.document.documentElement.style.colorScheme).toBe("dark");
});

test("浅色与自定义背景也使用宿主实际颜色，不硬编码黑白背景", () => {
  for (const canvas of ["#ffffff", "#eee5ff"]) {
    const window = loadBeforeBridge(canvas, "#202124", "light");
    expect(window.getComputedStyle(window.document.getElementById("editor")!).backgroundColor).toBe(
      canvas,
    );
    expect(window.document.documentElement.style.colorScheme).toBe("light");
  }
});

test("初始化配色不阻止 bridge 后续更新主题变量", () => {
  const window = loadBeforeBridge("#1c1c1c", "#eeeeee", "dark");
  const root = window.document.documentElement;
  root.style.setProperty("--lonanote-editor-canvas", "#eee5ff");
  root.style.setProperty("--lonanote-editor-text", "#202124");
  for (const element of [root, window.document.body, window.document.getElementById("editor")!]) {
    expect(window.getComputedStyle(element).backgroundColor).toBe("#eee5ff");
    expect(window.getComputedStyle(element).color).toBe("#202124");
  }
});

test("没有 iframe 宿主时保留 Native 在内容加载前注入的主题", () => {
  const window = new Window();
  window.document.write(html);
  window.document.documentElement.style.setProperty("--lonanote-editor-canvas", "#18181b");
  window.document.documentElement.style.colorScheme = "dark";
  runInNewContext(window.document.querySelector("head script:not([type])")!.textContent, {
    window,
    document: window.document,
  });
  expect(window.document.documentElement.style.getPropertyValue("--lonanote-editor-canvas")).toBe(
    "#18181b",
  );
  expect(window.document.documentElement.style.colorScheme).toBe("dark");
});
