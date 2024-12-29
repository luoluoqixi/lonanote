export const utils = {
  getOriginalPx: (level: number, targetHeight: number) => {
    const scale = Math.pow(1.2, level);
    return Math.floor(targetHeight / scale);
  },
  getTitleHeight: (zoom: number, titleHeight: number) => {
    if (zoom < 0) {
      const h = utils.getOriginalPx(zoom, titleHeight);
      return h;
    } else {
      return titleHeight;
    }
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
};
