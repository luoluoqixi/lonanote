'use client';

import { Button, ButtonProps, Select } from '@radix-ui/themes';
import { ThemeProvider, useTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import { forwardRef, useMemo } from 'react';
import { IconBaseProps } from 'react-icons/lib';
import { LuMoon, LuSun } from 'react-icons/lu';

export const colorModeList = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof colorModeList)[number];
export type ResolvedColorMode = 'light' | 'dark' | undefined;

export interface ColorModeState {
  /** Active colorMode name */
  colorMode?: ColorMode;
  /** If `enableSystem` is true and the active theme is "system", this returns whether the system preference resolved to "dark" or "light". Otherwise, identical to `colorMode` */
  resolvedColorMode?: ResolvedColorMode;
  /** Update the colorMode */
  setColorMode: (colorMode: ColorMode) => void;
  /** toggle colorMode: 'light' | 'dark' */
  toggleColorMode: () => void;
}

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
    setColorMode(resolvedTheme === 'light' ? 'dark' : 'light');
  };
  const setColorMode = (colorMode: ColorMode) => {
    setTheme(colorMode);
  };
  const state: ColorModeState = {
    colorMode: theme as ColorMode,
    resolvedColorMode: resolvedTheme as ResolvedColorMode,
    setColorMode,
    toggleColorMode,
  };
  return state;
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { resolvedColorMode } = useColorMode();
  return resolvedColorMode === 'light' ? light : dark;
}

export function ColorModeIcon(props: IconBaseProps) {
  const { resolvedColorMode } = useColorMode();
  return resolvedColorMode === 'light' ? <LuSun {...props} /> : <LuMoon {...props} />;
}

export interface ColorModeButtonProps extends Omit<ButtonProps, 'aria-label'> {}

export const ColorModeButton = forwardRef<HTMLButtonElement, ColorModeButtonProps>((props, ref) => {
  const { toggleColorMode } = useColorMode();
  return (
    <Button ref={ref} onClick={toggleColorMode} aria-label="Toggle color mode" {...props}>
      <ColorModeIcon width={20} height={20} />
    </Button>
  );
});

export interface ColorModeLabels extends Record<ColorMode, string> {}

export interface ColorModeSelectProps extends Omit<Select.RootProps, 'children'> {
  labels: ColorModeLabels;
  triggerProps?: Select.TriggerProps;
  contentProps?: Select.ContentProps;
}

export const ColorModeSelect = (props: ColorModeSelectProps) => {
  const { labels, triggerProps, contentProps, ...rest } = props;
  const { colorMode, setColorMode } = useColorMode();
  const items = useMemo(() => {
    return colorModeList.map((colorMode) => ({
      value: colorMode,
      label: labels[colorMode],
    }));
  }, [labels]);
  return (
    <Select.Root
      {...rest}
      value={colorMode}
      onValueChange={(v) => {
        setColorMode((v || 'light') as ColorMode);
      }}
    >
      <Select.Trigger {...triggerProps}>{colorMode ? labels[colorMode] : ''}</Select.Trigger>
      <Select.Content {...contentProps}>
        {items.map((item) => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};
