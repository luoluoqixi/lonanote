import { ColorModeLabels, SelectProps, ColorModeSelect as UIColorModeSelect } from './ui';

const colorMode: ColorModeLabels = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

export const ColorModeSelect = (props: SelectProps) => {
  return <UIColorModeSelect labels={colorMode} {...props} />;
};
