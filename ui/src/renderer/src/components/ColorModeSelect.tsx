import {
  ColorModeLabels,
  ColorModeSelectProps,
  ColorModeSelect as UIColorModeSelect,
} from './provider/ColorModeProvider';

const colorMode: ColorModeLabels = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

export const ColorModeSelect = (props: Omit<ColorModeSelectProps, 'labels'>) => {
  return <UIColorModeSelect aria-label="ColorMode Select" labels={colorMode} {...props} />;
};
