import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI | undefined;
    api:
      | {
          setTitleBarColor: (color: string, backgroudColor: string) => Promise<any>;
          getZoom: () => Promise<number>;
          addZoomChangeListener: (callback: (zoom: number) => void) => void;
          removeZoomChangeListener: (callback: (zoom: number) => void) => void;

          invoke: (
            key: string,
            args: string | null | undefined,
          ) => Promise<string | null | undefined>;
          getCommandKeys: () => Promise<string[]>;
          getCommandLen: () => Promise<number>;

          invokeAsync: (
            key: string,
            args: string | null | undefined,
          ) => Promise<string | null | undefined>;
          getCommandAsyncKeys: () => Promise<string[]>;
          getCommandAsyncLen: () => Promise<number>;

          regJsFunction: (
            key: string,
            callback: (args: string | null | undefined) => Promise<string | null | undefined>,
          ) => Promise<void>;
          unregJsFunction: (key: string) => Promise<void>;
          clearJsFunction: () => Promise<void>;
          getCommandJsKeys: () => Promise<string[]>;
          getCommandJsLen: () => Promise<number>;
        }
      | undefined;
  }
}
