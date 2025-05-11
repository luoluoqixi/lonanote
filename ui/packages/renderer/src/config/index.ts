export const config = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  Mode: import.meta.env.MODE,
  buildMode: import.meta.env['LONANOTE_BUILD_MODE'],
  version: (window as any)['APP_VERSION'] as string,
};
