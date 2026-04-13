import { useCallback, useState } from 'react';

const useForceUpdate = () => {
  const [, setUpdate] = useState<boolean>(false);
  const forceUpdate = useCallback(() => {
    setUpdate((prev: boolean): boolean => !prev);
  }, []);
  return forceUpdate;
};

export { useForceUpdate };
