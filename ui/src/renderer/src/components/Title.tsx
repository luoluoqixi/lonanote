import { useToken } from '@chakra-ui/react';
import { useEffect } from 'react';

import { isElectron } from '@/bindings/core';
import { useWindowTitleHeight } from '@/hooks';
import { utils } from '@/utils';

import { useColorMode } from './ui';

const titlebarStyle = `
.titlebar {
  ${isElectron ? 'app-region: drag;' : ''}
  user-select: none;
  position: fixed;
  width: 100%;
  pointer-events: none;
}
`;

export const Title = () => {
  const [bgColor, fgColor] = useToken('colors', ['bg', 'fg']);
  const { resolvedColorMode } = useColorMode();
  useEffect(() => {
    if (!window.api) return;
    requestAnimationFrame(() => {
      if (window.api && window.api.setTitleBarColor) {
        const bg = utils.getCssVariableValue(bgColor);
        const fg = utils.getCssVariableValue(fgColor);
        window.api.setTitleBarColor(fg, bg);
      }
    });
  }, [resolvedColorMode]);
  const titleHeight = useWindowTitleHeight();
  return (
    <>
      <style>{titlebarStyle}</style>
      <div className="titlebar" style={{ height: titleHeight }}></div>
    </>
  );
};
