export type BrowserType = 'ie' | 'chrome' | 'firefox' | 'safari' | 'unknown';
export type PlatformType = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown';

export const utils = {
  getCssVariableValue: (variableName: string, element?: Element | null): string => {
    if (variableName.startsWith('var(')) {
      variableName = variableName.substring(4, variableName.length - 1);
    }
    if (!element) {
      element = document.documentElement;
    }
    const computedStyle = getComputedStyle(element);
    return computedStyle.getPropertyValue(variableName).trim();
  },
  isDesktop: () => {
    const { platform } = utils.detectBrowserAndPlatform();
    return platform === 'windows' || platform === 'mac' || platform === 'linux';
  },
  isMobile: () => {
    const { platform } = utils.detectBrowserAndPlatform();
    return platform === 'android' || platform === 'ios';
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
  getFileName: (path: string): string => {
    const names = path.split(/\\|\//);
    const name = names.length > 0 ? names[names.length - 1] : '';
    return name;
  },
  isImgUrl: (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image');
  },
};
