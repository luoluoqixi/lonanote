import { useEffect, useState } from 'react';

function debounce(fn: () => void, ms: number) {
  let timer: number | undefined;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      fn();
    }, ms);
  };
}

export function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const debouncedResizeHandler = debounce(() => {
      setSize([window.innerWidth, window.innerHeight]);
    }, 100); // 100ms
    window.addEventListener('resize', debouncedResizeHandler);
    return () => window.removeEventListener('resize', debouncedResizeHandler);
  }, []); // Note this empty array. this effect should run only on mount and unmount
  return size;
}
