import { Extension } from '@codemirror/state';
import { vsCodeDark } from '@fsegurai/codemirror-theme-vscode-dark';
import { vsCodeLight } from '@fsegurai/codemirror-theme-vscode-light';

import { useColorModeValue } from '@/components/provider/ColorModeProvider';

import './theme.scss';

const darkTheme = vsCodeDark;
const lightTheme = vsCodeLight;

export const useCodeMirrorTheme = () => {
  const theme = useColorModeValue<Extension>(lightTheme, darkTheme);
  return theme;
};
