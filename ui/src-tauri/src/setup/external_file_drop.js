(() => {
  const channel = "lonanote:external-file-drop";
  // 仅顶层宿主持有认证信息；不暴露到 window 或可读取的函数源码中。
  const invokeKey = window === window.top ? __LONANOTE_INVOKE_KEY__ : null;
  const isExternal = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const deliver = (files, x, y) => {
    const report = (error) => {
      window.console.warn("[external-file-drop] bridge failed", String(error));
      window.dispatchEvent(new CustomEvent(channel, { detail: { error: String(error), x, y } }));
    };
    try {
      const bridge = window.chrome?.webview;
      if (bridge?.postMessageWithAdditionalObjects) {
        // 由 WebView2 从实际 File 对象提取路径，不能用文件名猜测磁盘位置。
        // Wry 的先行 handler 只接受字符串。使用合法 Tauri envelope，避免其失败阻断后续 handler。
        const internals = window.__TAURI_INTERNALS__;
        let timer;
        const cleanup = () => {
          window.clearTimeout(timer);
          internals.unregisterCallback(callback);
          internals.unregisterCallback(error);
        };
        const callback = internals.transformCallback(cleanup, true);
        const error = internals.transformCallback((reason) => {
          cleanup();
          report(reason);
        }, true);
        timer = window.setTimeout(() => {
          cleanup();
          report("原生文件拖放接收器未响应");
        }, 10000);
        try {
          bridge.postMessageWithAdditionalObjects(
            JSON.stringify({
              cmd: "capture_external_file_drop",
              callback,
              error,
              payload: { channel, names: files.map((file) => file.name), x, y },
              __TAURI_INVOKE_KEY__: invokeKey,
            }),
            files,
          );
        } catch (reason) {
          cleanup();
          throw reason;
        }
        window.console.debug("[external-file-drop] bridge sent", { count: files.length, x, y });
      } else {
        if (bridge) throw new Error("当前 WebView2 不支持读取拖放文件，请更新 WebView2 Runtime");
        // macOS 从当前系统拖放 pasteboard 读取路径；Linux 由原生 drag-drop 事件接管。
        window.__TAURI_INTERNALS__
          ?.invoke("capture_external_file_drop", {
            names: files.map((file) => file.name),
            x,
            y,
          })
          ?.catch(report);
      }
    } catch (error) {
      report(error);
    }
  };
  if (window === window.top) {
    window.addEventListener("message", (event) => {
      if (!event.source || event.data?.channel !== channel || !Array.isArray(event.data.files))
        return;
      const frame = Array.from(document.querySelectorAll("#desktop-editor-area iframe")).find(
        (frame) => frame.contentWindow === event.source,
      );
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      deliver(event.data.files, rect.left + event.data.x, rect.top + event.data.y);
    });
  }
  document.addEventListener(
    "dragover",
    (event) => {
      if (isExternal(event)) event.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "drop",
    (event) => {
      if (!isExternal(event)) return;
      event.preventDefault();
      event.stopPropagation();
      // 编辑区之外也禁止浏览器导航，但不把文件打开到任意标签组。
      if (window === window.top && !event.target?.closest?.("#desktop-editor-area")) return;
      const files = Array.from(event.dataTransfer.files ?? []);
      if (!files.length) return;
      if (window !== window.top) {
        window.parent.postMessage({ channel, files, x: event.clientX, y: event.clientY }, "*");
      } else {
        deliver(files, event.clientX, event.clientY);
      }
    },
    true,
  );
})();
