import { useEffect } from 'react';

import { useWindowTitleHeight } from '@/hooks';
import { utils } from '@/utils';

import { useColorMode } from './ui';
import { system } from './ui/theme';

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
  return <div className="titlebar" style={{ height: titleHeight, width: '100%' }}></div>;
};
