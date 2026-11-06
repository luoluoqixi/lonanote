export type WindowCloseMessage = {
  windowLabel: string;
  requestId: string;
  stage: "barrier" | "prepare" | "commit" | "abort";
};

/** 私有关闭协议必须核验目标窗口；全局配置广播不能复用此通道。 */
export async function routeWindowCloseMessage(
  currentWindowLabel: string,
  message: WindowCloseMessage,
  handle: (message: WindowCloseMessage) => Promise<void>,
): Promise<void> {
  if (message.windowLabel !== currentWindowLabel) return;
  await handle(message);
}
