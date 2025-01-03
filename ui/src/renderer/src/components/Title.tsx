import { useEffect } from 'react';

import { isElectron } from '@/bindings/core';
import { useWindowTitleHeight } from '@/hooks';
import { utils } from '@/utils';

import { useColorMode } from './ui';
import { system } from './ui/theme';

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
  const { resolvedColorMode } = useColorMode();
  useEffect(() => {
    if (!window.api) return;
    requestAnimationFrame(() => {
      if (window.api && window.api.setTitleBarColor) {
        const bg = utils.getCssVariableValue(system.token('colors.bg'));
        const fg = utils.getCssVariableValue(system.token('colors.fg'));
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
