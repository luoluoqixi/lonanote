export type BrowserType = 'ie' | 'chrome' | 'firefox' | 'safari' | 'unknown';
export type PlatformType = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown';

export const utils = {
  getOriginalPx: (level: number, targetHeight: number) => {
    const scale = Math.pow(1.2, level);
    return Math.floor(targetHeight / scale);
  },
  getTitleHeight: (zoom: number, titleHeight: number) => {
    if (zoom < 0) {
      const h = utils.getOriginalPx(zoom, titleHeight);
      return h;
    }
    return titleHeight;
  },
  getCssVariableValue: (
    variableName: string,
    element: HTMLElement = document.documentElement,
  ): string => {
    if (variableName.startsWith('var(')) {
      variableName = variableName.substring(4, variableName.length - 1);
    }
    const computedStyle = getComputedStyle(element);
    return computedStyle.getPropertyValue(variableName).trim();
  },
  detectBrowserAndPlatform: () => {
    const userAgent = navigator.userAgent;
    const isIE = !!(document as any).documentMode;
    let browserName: BrowserType;
    let platform: PlatformType;
    if (isIE) {
      browserName = 'ie';
    } else if (/chrome/i.test(userAgent)) {
      browserName = 'chrome';
    } else if (/firefox/i.test(userAgent)) {
      browserName = 'firefox';
    } else if (/safari/i.test(userAgent)) {
      browserName = 'safari';
    } else {
      browserName = 'unknown';
    }
    if (/android/i.test(userAgent)) {
      platform = 'android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      platform = 'ios';
    } else if (/win/i.test(userAgent)) {
      platform = 'windows';
    } else if (/mac/i.test(userAgent)) {
      platform = 'mac';
    } else if (/linux/i.test(userAgent)) {
      platform = 'linux';
    } else {
      platform = 'unknown';
    }
    return {
      browser: browserName,
      platform,
    };
  },
};
