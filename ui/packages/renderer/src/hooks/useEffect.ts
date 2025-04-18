import { DependencyList, useEffect as useReactEffect } from 'react';

export const useEffect = (
  callback: (() => any) | (() => Promise<any>) | undefined,
  deps?: DependencyList,
) => {
  useReactEffect(() => {
    if (callback) {
      const result = callback();
      if (typeof result === 'function') {
        return result;
      }
    }
  }, deps);
};
