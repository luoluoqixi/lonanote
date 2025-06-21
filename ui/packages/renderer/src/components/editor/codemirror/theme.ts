import { Extension } from '@codemirror/state';
import { vsCodeDark } from '@fsegurai/codemirror-theme-vscode-dark';
import { vsCodeLight } from '@fsegurai/codemirror-theme-vscode-light';
import 'lonanote-styles/codemirror-theme.scss';

import { useColorModeValue } from '@/components/provider/ColorModeProvider';

export const codemirrorDarkTheme = vsCodeDark;
export const codemirrorLightTheme = vsCodeLight;

export const useCodeMirrorTheme = () => {
  const theme = useColorModeValue<Extension>(codemirrorLightTheme, codemirrorDarkTheme);
  return theme;
};
