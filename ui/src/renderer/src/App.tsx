import { useState } from 'react';

import { Title, dialog, spinner } from './components';
import { Toaster } from './components/ui';
import { useInited } from './hooks';
import { Routes } from './pages/desktop/routes';

export const App = () => {
  const [inited, setInited] = useState(false);
  useInited(async () => {
    window.initializeSuccess = true;
    setInited(true);
  });
  return (
    <>
      <Title />
      {inited && <Routes />}
      <Toaster />
      <spinner.GlobalSpinner />
      <dialog.GlobalDialog />
    </>
  );
};
