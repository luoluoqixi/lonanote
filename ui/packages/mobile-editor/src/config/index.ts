export const config = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  Mode: import.meta.env.MODE,
  buildMode: import.meta.env['LONANOTE_BUILD_MODE'],
  testContent: import.meta.env['LONANOTE_TEST_CONTENT'] || null,
  version: __APP_VERSION__,
  isFlutter: window.EditorBridge != null,

  rootId: 'root',
  cmRootId: 'cm-root',
  mdRootId: 'md-root',
};
