import { ColorModeLabels, SelectProps, ColorModeSelect as UIColorModeSelect } from './ui';

const colorModeI18n: ColorModeLabels = {
  light: {
    zh_CN: '浅色',
  },
  dark: {
    zh_CN: '深色',
  },
  system: {
    zh_CN: '跟随系统',
  },
};

export const ColorModeSelect = (props: SelectProps) => {
  return <UIColorModeSelect labels={colorModeI18n} lang="zh_CN" {...props} />;
};
