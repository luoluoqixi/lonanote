'use client';

import { Theme, ThemePanel, ThemeProps } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';

// import { defaultTheme, useUISettings } from '@/controller/settings';

import { ColorModeProvider } from './ColorModeProvider';

export function Provider(props: ThemeProps) {
  return (
    <ColorModeProvider>
      <Theme style={{ height: '100vh' }} {...props}>
        {props.children}
        {/* <ThemePanel /> */}
      </Theme>
      <ToastContainer
        position="bottom-right"
        toastStyle={{
          width: '50vw',
        }}
      />
    </ColorModeProvider>
  );
}
