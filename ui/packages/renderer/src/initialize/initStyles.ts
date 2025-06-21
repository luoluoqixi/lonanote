import '@radix-ui/themes/styles.css';

import '@/styles/index.scss';
import { utils } from '@/utils';

async function initStyles() {
  const { platform } = utils.detectBrowserAndPlatform();
  document.body.classList.add(platform);
  if (platform === 'windows') {
    await import('@/styles/platform/windows.scss');
  } else if (platform === 'mac') {
    await import('@/styles/platform/mac.scss');
  } else if (platform === 'linux') {
    await import('@/styles/platform/linux.scss');
  }
}

initStyles();
