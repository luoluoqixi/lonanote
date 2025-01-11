import { app } from 'electron';

import { setupApp } from './app';
import { init } from './bindings';

const gotTheLock = app.requestSingleInstanceLock();

const main = () => {
  init();
  setupApp();
};

if (!gotTheLock) {
  app.quit();
} else {
  main();
}
