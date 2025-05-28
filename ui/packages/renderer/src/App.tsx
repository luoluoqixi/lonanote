import { useState } from 'react';

import { Title, dialog, spinner } from './components';
import { useInited } from './hooks';
import Layout from './pages/Layout';
import { utils } from './utils';

const isDesktop = utils.isDesktop();

export const App = () => {
  const [inited, setInited] = useState(false);
  useInited(async () => {
    window.initializeSuccess = true;
    setInited(true);
  });
  return (
    <>
      {isDesktop && <Title />}
      {inited && <Layout />}
      <spinner.GlobalSpinner />
      <dialog.GlobalDialog />
    </>
  );
};
