import { useEffect } from './useEffect';

export const useInited = (callback: (() => any) | (() => Promise<any>) | undefined) => {
  useEffect(callback, []);
};
