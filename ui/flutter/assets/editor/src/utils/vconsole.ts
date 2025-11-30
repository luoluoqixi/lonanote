import { config } from '@/config';

export async function setupVConsole() {
  const { default: VConsole } = await import('vconsole');
  const vConsole = new VConsole({
    log: {
      maxLogNumber: 1000,
      showTimestamps: true,
    },
    theme: 'light',
    onReady() {
      console.log('vConsole init success');
    },
  });
  return vConsole;
}

window.setupVConsole = setupVConsole;

if (config.isDev) {
  setupVConsole();
}
