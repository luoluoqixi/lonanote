import { Extension } from '@codemirror/state';
import { vsCodeDark } from '@fsegurai/codemirror-theme-vscode-dark';
import { vsCodeLight } from '@fsegurai/codemirror-theme-vscode-light';

import { useColorModeValue } from '@/components/provider/ColorModeProvider';

import './theme.scss';

export const codemirrorDarkTheme = vsCodeDark;
export const codemirrorLightTheme = vsCodeLight;

export const useCodeMirrorTheme = () => {
  const theme = useColorModeValue<Extension>(codemirrorLightTheme, codemirrorDarkTheme);
  return theme;
};
