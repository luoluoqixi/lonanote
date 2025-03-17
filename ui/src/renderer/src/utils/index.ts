import chroma from 'chroma-js';

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
  generateColorShades: (baseColor: string) => {
    const scale = chroma
      .scale([chroma(baseColor).brighten(2), baseColor, chroma(baseColor).darken(2)])
      .mode('lab')
      .colors(10);
    return {
      '50': scale[0],
      '100': scale[1],
      '200': scale[2],
      '300': scale[3],
      '400': scale[4],
      '500': scale[5],
      '600': scale[6],
      '700': scale[7],
      '800': scale[8],
      '900': scale[9],
    };
  },
  fileNameCompare(a: string, b: string): number {
    if (a == null || b == null) return 0;
    const na = a.split(/[-_.—, (]/);
    const nb = b.split(/[-_.—, (]/);
    const maxLoop = Math.max(na.length, nb.length);
    for (let i = 0; i < maxLoop; i++) {
      const nai = Number(na[i]);
      const nbi = Number(na[i]);
      if (!isNaN(nai) && !isNaN(nbi)) {
        const num = nai - nbi;
        if (num !== 0) {
          return num;
        }
      }
    }
    const ma = a.match(/[0-9]+/);
    const mb = b.match(/[0-9]+/);
    if (ma?.length && mb?.length) {
      const num = Number(ma[0]) - Number(mb[0]);
      if (num !== 0) {
        return num;
      }
    }
    return a.localeCompare(b);
  },
  getFileName: (path: string): string => {
    const names = path.split(/\\|\//);
    const name = names.length > 0 ? names[names.length - 1] : '';
    return name;
  },
  getFileSizeStr: (size: number | null) => {
    if (size == null) return '0 kb';
    let unit = 1000;
    const { platform } = utils.detectBrowserAndPlatform();
    if (platform === 'windows') {
      unit = 1024;
    }
    return `${(size / unit).toFixed(2)} kb`;
  },
};

export * from './timeUtils';
