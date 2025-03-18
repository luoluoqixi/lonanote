'use client';

import { Theme, ThemeProps } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';

import { defaultThemeColor, useUISettings } from '@/controller/settings';

import { ColorModeProvider } from './ColorModeProvider';

const ThemeProvider = (props: ThemeProps) => {
  const themeColor = useUISettings((s) => s.themeColor);
  return (
    <Theme style={{ height: '100vh' }} accentColor={themeColor || defaultThemeColor} {...props} />
  );
};

export function Provider(props: ThemeProps) {
  return (
    <ColorModeProvider>
      <ThemeProvider {...props}>
        {props.children}
        {/* <ThemePanel /> */}
      </ThemeProvider>
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
