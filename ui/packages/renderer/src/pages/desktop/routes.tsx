import { useEffect, useState } from 'react';

import Layout from './Layout';

export const navigate = (to: string, options?: { replace?: boolean; state?: any }) => {
  throw new Error('desktop navigate not support');
};

interface FileHistory {
  history: string[];
  currentIndex: number;
}

const fileHistory: FileHistory = {
  history: [],
  currentIndex: -1,
};

const dispatchFileHistoryChange = () => {
  const event = new Event('filehistorychange');
  window.dispatchEvent(event);
};

export const getFileHistory = () => {
  return fileHistory;
};

export const pushFileHistory = (file: string | null) => {
  setSearchParams('file', file);
  if (file == null) return;
  if (fileHistory.history.length === 0) {
    fileHistory.history.push(file);
    fileHistory.currentIndex = 0;
  } else {
    const length = fileHistory.history.length;
    if (fileHistory.currentIndex !== length - 1) {
      for (let i = length - 1; i > fileHistory.currentIndex; i--) {
        if (i < 0) continue;
        fileHistory.history.pop();
      }
    }
    fileHistory.history.push(file);
    fileHistory.currentIndex = fileHistory.history.length - 1;
  }
  dispatchFileHistoryChange();
};

export const clearFileHistory = () => {
  fileHistory.currentIndex = -1;
  fileHistory.history = [];
  dispatchFileHistoryChange();
};

export const getCurrentFile = () => {
  const file = window.getSearchParams?.('file');
  if (file) {
    return decodeURIComponent(file as string);
  }
  return null;
};

export const useFileHistory = () => {
  const [fileHistory, setFileHistory] = useState(() => ({ ...getFileHistory() }));

  useEffect(() => {
    const handleUpdate = () => {
      setFileHistory({ ...getFileHistory() });
    };

    window.addEventListener('filehistorychange', handleUpdate);
    return () => window.removeEventListener('filehistorychange', handleUpdate);
  }, []);

  return fileHistory;
};

export const navigateFile = (to: string | number | null) => {
  if (to == null) {
    pushFileHistory(to);
    return;
  }
  const t = typeof to;
  if (t === 'string') {
    pushFileHistory(to as string);
  } else if (t === 'number') {
    to = to as number;
    const currentIndex = fileHistory.currentIndex;
    if (currentIndex === -1) return;

    const newIndex = currentIndex + to;
    if (newIndex < 0 || newIndex >= fileHistory.history.length) {
      return;
    }

    const targetFile = fileHistory.history[newIndex];
    fileHistory.currentIndex = newIndex;
    setSearchParams('file', targetFile);
    dispatchFileHistoryChange();
  }
};
export const backFile = () => navigateFile(-1);
export const forwardFile = () => navigateFile(1);

export const useSearchParams = () => {
  const [searchParams, setSearchParams] = useState(() => {
    return new URLSearchParams(window.location.search);
  });

  useEffect(() => {
    const handleUpdate = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleUpdate);
    window.addEventListener('searchchange', handleUpdate);
    return () => {
      window.removeEventListener('popstate', handleUpdate);
      window.removeEventListener('searchchange', handleUpdate);
    };
  }, []);

  return Object.fromEntries(searchParams.entries());
};

export const getSearchParams = (name?: string): string | URLSearchParams | null => {
  const search = new URLSearchParams(window.location.search);
  return name ? search.get(name) : search;
};

export const setSearchParams = (name: string, value: string | null) => {
  const search = new URLSearchParams(window.location.search);
  if (value == null) {
    search.delete(name);
  } else {
    search.set(name, value);
  }
  replaceSearch(search);
};

export const replaceSearch = (search: URLSearchParams) => {
  const url = new URL(window.location.href);
  url.search = search.toString();
  history.replaceState('', '', url.href);
  const event = new Event('searchchange');
  window.dispatchEvent(event);
  // console.log(window.location.href);
};

window.navigate = navigate;

window.useSearchParams = useSearchParams;
window.setSearchParams = setSearchParams;
window.getSearchParams = getSearchParams;

window.navigateFile = navigateFile;
window.backFile = backFile;
window.forwardFile = forwardFile;

window.useFileHistory = useFileHistory;
window.clearFileHistory = clearFileHistory;
window.getCurrentFile = getCurrentFile;

export const Routes = () => {
  return <Layout />;
};
