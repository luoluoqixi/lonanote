import { createStore } from './store';

const store = createStore();

const keys = {
  windowSize: 'windowSize',
  zoom: 'zoom',
  titlebarColor: 'titlebarColor',
  titlebarBackgroundColor: 'titlebarBackgroundColor',
};

export interface Size {
  width: number;
  height: number;
}

export const settings = {
  getWindowSize: (): Size => {
    const windowSize = store.get(keys.windowSize);
    if (
      windowSize &&
      typeof windowSize.width === 'number' &&
      typeof windowSize.height === 'number'
    ) {
      return windowSize;
    }
    return {
      width: 1000,
      height: 600,
    };
  },
  setWindowSize: (size: Size) => {
    store.set(keys.windowSize, size);
  },
  getTitleBarColor: () => {
    return store.get(keys.titlebarColor) || 'black';
  },
  setTitleBarColor: (color: string) => {
    store.set(keys.titlebarColor, color);
  },
  getTitleBarBackgroudColor: () => {
    return store.get(keys.titlebarBackgroundColor) || 'white';
  },
  setTitleBarBackgroudColor: (color: string) => {
    store.set(keys.titlebarBackgroundColor, color);
  },
  getZoom: () => {
    const zoom = store.get(keys.zoom);
    return typeof zoom === 'number' ? zoom : 0;
  },
  setZoom: (zoom: number) => {
    store.set(keys.zoom, zoom);
  },
  getZoomActualPx: (level: number, px: number) => {
    const scale = Math.pow(1.2, level);
    return Math.floor(px * scale);
  },
  maxZoom: 8, // 9,
  minZoom: -8,
  defaultTitleBarHeight: 30,
};
