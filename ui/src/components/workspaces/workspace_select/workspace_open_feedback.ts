import { getErrorMessage } from "@/api/common/error_message";

export function notifyWorkspaceOpenError(
  error: unknown,
  toast: { info: (message: string) => unknown; error: (message: string) => unknown },
): void {
  const message = getErrorMessage(error, "打开工作区失败");
  // 桌面会定位已拥有该工作区的窗口，这属于占用提示而非打开故障。
  if (message === "该工作区已在另一个窗口打开") {
    toast.info(message);
    return;
  }
  toast.error(message);
}
