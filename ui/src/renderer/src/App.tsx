import { useState } from 'react';
import { TbChevronsDownRight } from 'react-icons/tb';

import { Title, dialog, spinner } from './components';
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
      <spinner.GlobalSpinner />
      <dialog.GlobalDialog />
      <TbChevronsDownRight />
    </>
  );
};
