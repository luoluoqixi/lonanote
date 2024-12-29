import { useState } from 'react';

import { utils } from '@/utils';

import { useEffect } from './useEffect';
import { useInited } from './useInited';

export const defaultTitleHeight = 30;

export const useWindowTitleHeight = () => {
  const [titleHeight, setTitleHeight] = useState(defaultTitleHeight);
  useEffect(() => {
    if (window.api) {
      const onZoomChange = (zoom: number) => {
        const h = utils.getTitleHeight(zoom, defaultTitleHeight);
        // console.log(zoom, h, titleHeight);
        if (h !== titleHeight) {
          setTitleHeight(h);
        }
      };
      window.api.addZoomChangeListener(onZoomChange);
      return () => window.api?.removeZoomChangeListener(onZoomChange);
    }
    return undefined;
  }, [titleHeight]);
  useInited(async () => {
    if (window.api) {
      const initZoom = await window.api.getZoom();
      if (initZoom && initZoom !== titleHeight) {
        const h = utils.getTitleHeight(initZoom, defaultTitleHeight);
        if (h !== titleHeight) {
          setTitleHeight(h);
        }
      }
    }
  });
  return titleHeight;
};
