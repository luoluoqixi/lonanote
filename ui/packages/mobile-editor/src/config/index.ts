export const config = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  Mode: import.meta.env.MODE,
  buildMode: import.meta.env['LONANOTE_BUILD_MODE'],
  testContent: import.meta.env['LONANOTE_TEST_CONTENT'] || null,
  version: __APP_VERSION__,
  isFlutter: window.EditorBridge != null,
  titleBarHeight: null as number | null,

  rootId: 'root',
  cmRootId: 'cm-root',
  mdRootId: 'md-root',
};

const getCssVariableValue = (variableName: string, element?: Element | null): string => {
  if (variableName.startsWith('var(')) {
    variableName = variableName.substring(4, variableName.length - 1);
  }
  if (!element) {
    element = document.documentElement;
  }
  const computedStyle = getComputedStyle(element);
  return computedStyle.getPropertyValue(variableName).trim();
};

export const getTitleBarHeight = () => {
  if (config.titleBarHeight == null) {
    const heightStr = getCssVariableValue(
      '--title-bar-height',
      document.getElementById(config.rootId),
    );
    const n = Number.parseFloat(heightStr);
    if (!Number.isNaN(n)) {
      config.titleBarHeight = n;
    } else {
      config.titleBarHeight = 0;
    }
  }
  const h = (config.titleBarHeight || 0) + (window.statusBarHeight || 0);
  return h;
};
