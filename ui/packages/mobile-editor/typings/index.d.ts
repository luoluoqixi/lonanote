declare const __APP_VERSION__: string;

interface Window {
  setupVConsole: () => Promise<any>;
  setColorMode: (mode: string) => Promise<any>;
  initEditor: (contentJson: string) => Promise<any>;
}
