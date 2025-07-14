export const callFlutter = (command: string, data?: any) => {
  if (window.flutter_inappwebview != null && window.flutter_inappwebview.callHandler != null) {
    if (data != null) {
      data = JSON.stringify(data);
    }
    window.flutter_inappwebview.callHandler(command, data);
  }
};
