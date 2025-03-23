import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/initialize';

import { App } from './App';
import { Provider } from './components';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
);
