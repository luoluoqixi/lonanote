import { useState } from 'react';

import { Title } from './components';
import { Toaster } from './components/ui';
import { useInited } from './hooks';
import { Routes } from './pages/desktop/routes';
import { spinner } from './utils';

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
    </>
  );
};
