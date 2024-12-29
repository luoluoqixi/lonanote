'use client';

import type { IconButtonProps } from '@chakra-ui/react';
import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react';
import { ThemeProvider, useTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import * as React from 'react';
import { useMemo } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';

import { Select, SelectProps, SelectValue } from './select';

export const colorModeList = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof colorModeList)[number];
export type ResolvedColorMode = 'light' | 'dark' | undefined;

export type ColorModeState = {
  /** Active colorMode name */
  colorMode?: ColorMode;
  /** If `enableSystem` is true and the active theme is "system", this returns whether the system preference resolved to "dark" or "light". Otherwise, identical to `colorMode` */
  resolvedColorMode?: ResolvedColorMode;
  /** Update the colorMode */
  setColorMode: (colorMode: ColorMode) => void;
  /** toggle colorMode: 'light' | 'dark' */
  toggleColorMode: () => void;
};

export interface ColorModeProviderProps extends ThemeProviderProps {}

export function ColorModeProvider(props: ColorModeProviderProps) {
  const { children, ...rese } = props;
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      storageKey="current-color-mode"
      {...rese}
    >
      {children}
    </ThemeProvider>
  );
}

export function useColorMode(): ColorModeState {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const toggleColorMode = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };
  return {
    colorMode: theme as ColorMode,
    resolvedColorMode: resolvedTheme as ResolvedColorMode,
    setColorMode: setTheme,
    toggleColorMode,
  };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { resolvedColorMode } = useColorMode();
  return resolvedColorMode === 'light' ? light : dark;
}

export function ColorModeIcon() {
  const { resolvedColorMode } = useColorMode();
  return resolvedColorMode === 'light' ? <LuSun /> : <LuMoon />;
}

export interface ColorModeButtonProps extends Omit<IconButtonProps, 'aria-label'> {}

export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode();
    return (
      <ClientOnly fallback={<Skeleton boxSize="8" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: '5',
              height: '5',
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    );
  },
);

export interface ColorModeSelectProps extends SelectProps {
  labels: ColorModeLabels;
  lang: string;
}

export interface ColorModeLabels extends Record<ColorMode, Record<string, string>> {}

export const ColorModeSelect = React.forwardRef<HTMLDivElement, ColorModeSelectProps>(
  function ColorModeSelect(props, ref) {
    const { labels, lang, ...rest } = props;
    const { colorMode, setColorMode } = useColorMode();
    const items: SelectValue[] = useMemo(() => {
      return colorModeList.map((colorMode) => ({
        value: colorMode,
        label: labels[colorMode][lang],
      }));
    }, [labels, lang]);
    return (
      <Select
        {...rest}
        ref={ref}
        value={colorMode}
        onValueChange={(v) => {
          setColorMode((v || 'light') as ColorMode);
        }}
        items={items}
      />
    );
  },
);
