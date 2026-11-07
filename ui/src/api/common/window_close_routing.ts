export type WindowCloseMessage = {
  windowLabel: string;
  requestId: string;
  /** 会话 owner 也在本次关闭集合中，辅助窗口只参与输入屏障。 */
  closingOwner?: boolean;
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
