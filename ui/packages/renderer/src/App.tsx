import { useState } from 'react';

import { Title, dialog, spinner } from './components';
import { useUIPlatform } from './controller/settings';
import { useInited } from './hooks';
import DesktopLayout from './pages/desktop/Layout';
import MobileLayout from './pages/mobile/Layout';
import { utils } from './utils';

const isDesktop = utils.isDesktop();

export const App = () => {
  const [inited, setInited] = useState(false);
  const { isMobile } = useUIPlatform();
  useInited(async () => {
    window.initializeSuccess = true;
    setInited(true);
  });
  return (
    <>
      {isDesktop && <Title />}
      {inited && (isMobile ? <MobileLayout /> : <DesktopLayout />)}
      <spinner.GlobalSpinner />
      <dialog.GlobalDialog />
    </>
  );
};
