import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, lazy } from "react";
import { createRoot } from "react-dom/client";

import { DialogContentBoundary } from "../src/api/common/dialogs/dialog_content_boundary";

const dom = new Window();
globalThis.window = dom as unknown as typeof window;
globalThis.document = dom.document as unknown as Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("lazy 内容提交后才 ready，fallback 不触发 ready", async () => {
  let resolve!: (module: { default: () => React.JSX.Element }) => void;
  let ready = false;
  const Content = lazy(
    () =>
      new Promise<{ default: () => React.JSX.Element }>((done) => {
        resolve = done;
      }),
  );
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <DialogContentBoundary
        onReady={() => {
          ready = true;
        }}
        onError={() => {}}
        fallback={<span>等待</span>}
      >
        <Content />
      </DialogContentBoundary>,
    );
  });
  expect(host.textContent).toBe("等待");
  expect(ready).toBe(false);
  await act(async () => {
    resolve({ default: () => <span>表单</span> });
  });
  expect(host.textContent).toBe("表单");
  expect(ready).toBe(true);
  await act(() => root.unmount());
});

test("需要业务数据的 renderer 挂载不会提前 ready", async () => {
  let ready = false;
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <DialogContentBoundary
        deferReady
        onReady={() => {
          ready = true;
        }}
        onError={() => {}}
        fallback={null}
      >
        <span>读取目录</span>
      </DialogContentBoundary>,
    );
  });
  expect(host.textContent).toBe("读取目录");
  expect(ready).toBe(false);
  await act(() => root.unmount());
});

test("renderer 异常会回报错误且不发送 ready", async () => {
  let ready = false;
  let reported: unknown;
  const failure = new Error("模拟渲染失败");
  function Broken(): never {
    throw failure;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <DialogContentBoundary
        onReady={() => {
          ready = true;
        }}
        onError={(error) => {
          reported = error;
        }}
        fallback={null}
      >
        <Broken />
      </DialogContentBoundary>,
    );
  });
  expect(ready).toBe(false);
  expect(reported).toBe(failure);
  await act(() => root.unmount());
});
