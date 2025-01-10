'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { getThemeColor, useUISettings } from '@/controller/settings';

import { ColorModeProvider, type ColorModeProviderProps } from '../color-mode';
import { createDynamicTheme } from '../theme';

const defaultTheme = createDynamicTheme(getThemeColor());

export function Provider(props: ColorModeProviderProps) {
  const [theme, setTheme] = useState(defaultTheme);
  const themeColor = useUISettings((s) => s.themeColor);
  useEffect(() => {
    setTheme(createDynamicTheme(getThemeColor()));
  }, [themeColor]);
  return (
    <ChakraProvider value={theme}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
