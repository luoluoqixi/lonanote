'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { useSettingsStore } from '@/models';

import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';
import { createDynamicTheme } from './theme';

const defaultTheme = createDynamicTheme();

export function Provider(props: ColorModeProviderProps) {
  const [theme, setTheme] = useState(defaultTheme);
  const settings = useSettingsStore((s) => s.appearanceSettings);
  useEffect(() => {
    setTheme(createDynamicTheme());
  }, [settings]);
  return (
    <ChakraProvider value={theme}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
