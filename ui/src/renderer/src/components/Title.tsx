import { useEffect } from 'react';

import { isElectron } from '@/bindings/core';
import { useUISettings } from '@/controller/settings';
import { useWindowTitleHeight } from '@/hooks';
import { utils } from '@/utils';

import { useColorMode } from './provider/ColorModeProvider';

const titlebarStyle = `
.titlebar {
  ${isElectron ? 'app-region: drag;' : ''}
  user-select: none;
  position: fixed;
  width: 100%;
  pointer-events: none;
  background-color: var(--color-background);
}
`;

export const Title = () => {
  const { resolvedColorMode } = useColorMode();
  const themeColor = useUISettings((s) => s.themeColor);
  useEffect(() => {
    if (!window.api) return;
    requestAnimationFrame(() => {
      const updateTitleBar = () => {
        if (window.api && resolvedColorMode) {
          const bg = utils.getCssVariableValue('--color-background');
          const fg = utils.getCssVariableValue('--gray-12');
          window.api.utils.setTitleBarColor(fg || '#000000', bg || '#ffffff');
        }
      };
      updateTitleBar();
      setTimeout(updateTitleBar, 200);
    });
  }, [resolvedColorMode, themeColor]);
  const titleHeight = useWindowTitleHeight();
  return (
    <>
      <style>{titlebarStyle}</style>
      <div className="titlebar" style={{ height: titleHeight }}></div>
    </>
  );
};
