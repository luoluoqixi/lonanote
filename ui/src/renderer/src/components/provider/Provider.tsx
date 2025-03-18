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
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <ToastContainer
          stacked
          // hideProgressBar
          theme="colored"
          position="bottom-right"
          toastStyle={{
            width: '40vw',
            pointerEvents: 'auto',
          }}
        />
      </div>
    </ColorModeProvider>
  );
}
